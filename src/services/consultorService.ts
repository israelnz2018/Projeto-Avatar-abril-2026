/**
 * consultorService — resolve e carrega o "consultor" (tenant) do multi-tenant.
 *
 * Fase 0 (trilho invisível): só existe o consultor #0 ('israel') com a marca LBW.
 * Enquanto o doc `consultores/israel` NÃO existir no Firestore, o app usa o
 * CONSULTOR_PADRAO abaixo — ou seja, nada muda visualmente. Ver PLANO-WHITELABEL.md.
 */
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Consultor } from '../types';

const CONSULTORES_COLLECTION = 'consultores';

// Subdomínios reservados — NÃO são consultores (hub/marketing/institucional).
const RESERVADOS = new Set(['app', 'www', '']);

/**
 * Consultor #0 (Israel) com a marca LBW atual.
 * É o FALLBACK: enquanto o doc no Firestore não existir, o app usa estes valores.
 * Cores = a paleta LBW oficial (NAVY/BLUE/LIGHT/INK/MUTED).
 */
export const CONSULTOR_PADRAO: Consultor = {
  id: 'israel',
  nome: 'Learning by Working',
  subdominio: 'israel',
  ativo: true,
  criadoEm: '',
  branding: {
    nome: 'Learning by Working — Educação pelo Trabalho',
    logoUrl: 'https://i.postimg.cc/7PgJFtZK/logo-LBW.png',
    cores: {
      navy: '#1E2D6E',
      blue: '#0033CC',
      light: '#F0F2FA',
      ink: '#2A2F3A',
      muted: '#9CA3AF',
    },
  },
};

/**
 * Resolve o consultorId a partir do hostname (subdomínio).
 *   israel.educacaopelotrabalho.com → 'israel'
 *   consultorX.educacaopelotrabalho.com → 'consultorx'
 * Subdomínios reservados (app/www), domínio raiz, localhost ou IP → consultor #0.
 * (Na Fase 0 só existe 'israel', então tudo cai nele — sem mudança de comportamento.)
 */
export function resolveConsultorId(hostname?: string): string {
  const host = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase();
  if (!host || host === 'localhost' || /^[0-9.]+$/.test(host)) return 'israel';
  const partes = host.split('.');
  if (partes.length < 3) return 'israel'; // domínio raiz (a.com) não tem subdomínio
  const sub = partes[0];
  if (RESERVADOS.has(sub)) return 'israel';
  return sub;
}

/**
 * Estamos num SITE DE CONSULTOR (subdomínio branded, ex.: israel.educacaopelotrabalho.com)?
 * `app.`/`www.`/domínio raiz/localhost = false (contexto hub/admin do LBW).
 * Usado pra esconder o menu de admin quando o consultor está no site dele.
 */
export function isSiteConsultor(hostname?: string): boolean {
  const host = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase();
  if (!host || host === 'localhost' || /^[0-9.]+$/.test(host)) return false;
  const partes = host.split('.');
  if (partes.length < 3) return false;
  return !RESERVADOS.has(partes[0]);
}

/**
 * Carrega o consultor pelo id. Se o doc não existir (ou der erro), devolve o
 * CONSULTOR_PADRAO — o app NUNCA fica sem branding.
 */
export async function getConsultor(id: string): Promise<Consultor> {
  try {
    const snap = await getDoc(doc(db, CONSULTORES_COLLECTION, id));
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as Omit<Consultor, 'id'>) };
    }
  } catch (e) {
    console.error('[consultorService] erro ao carregar consultor', id, e);
  }
  return { ...CONSULTOR_PADRAO, id };
}
