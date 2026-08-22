/**
 * opiniaoService — depoimentos + avaliação (NPS interno) dos alunos.
 *
 * Fluxo: depois de ser aprovado na prova de qualquer trilha, o aluno preenche um
 * depoimento obrigatório: dá nota 1-5 para vários itens, responde à pergunta aberta
 * do consultor e autoriza (ou não) a divulgação nas redes sociais.
 *
 * Persistência:
 *   - Firestore `opiniaoClientes/{autoId}` = uma opinião (por trilha, por aluno).
 *   - Firestore `config/opiniaoItens` = a LISTA de itens avaliados (editável pelo admin).
 *     Se não existir, usa DEFAULT_ITENS embutido.
 */

import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, doc, getDoc, setDoc, query, orderBy } from 'firebase/firestore';
import { resolveConsultorId } from './consultorService';

export const OPINIOES_COLLECTION = 'opiniaoClientes';
export const OPINIAO_CONFIG_DOC = 'opiniaoItens'; // dentro da coleção 'config'
const CONFIG_COLLECTION = 'config';

/** Itens avaliados (nota 1-5). Editáveis por cada consultor — texto genérico, sem nome próprio. */
export const DEFAULT_ITENS: string[] = [
  'A didática do curso',
  'O software estatístico LBW',
  'Os vídeos do treinamento',
  'O mentor digital (IA)',
  'As ferramentas da qualidade disponíveis nas trilhas',
  'O suporte que oferecemos',
  'Avaliação geral do curso e da plataforma',
];
export const DEFAULT_PERGUNTA_ABERTA = 'Como foi sua experiência com este curso e com a plataforma LBW?';

// O Israel (consultor 'israel') mantém o doc legado 'opiniaoItens' (sem consultorId,
// já existia antes do modelo multi-tenant). Os demais consultores ganham um doc próprio
// 'opiniaoItens_{consultorId}' — cada um edita e vê só a sua lista.
function docIdOpiniaoItens(consultorId: string): string {
  return consultorId === 'israel' ? OPINIAO_CONFIG_DOC : `${OPINIAO_CONFIG_DOC}_${consultorId}`;
}

export interface OpiniaoItemNota {
  item: string;
  nota: number; // 1..5
}

export interface Opiniao {
  id?: string;
  uid: string;
  alunoNome: string;
  alunoEmail: string;
  trilha: number;
  trilhaTitulo: string;
  initiativeId?: string;
  consultorId?: string;
  notas: OpiniaoItemNota[];
  /** Média das notas (0..5), pré-calculada pra facilitar listagem/ordenação no admin. */
  mediaNota: number;
  comentario: string;
  autorizaDivulgacao: boolean;
  criadoEm: string;
}

export interface OpiniaoConfig {
  itens: string[];
  perguntaAberta: string;
}

// ===================================================================================
// Itens avaliados (config editável)
// ===================================================================================

export async function getOpiniaoItens(): Promise<string[]> {
  return (await getOpiniaoConfig()).itens;
}

export async function getOpiniaoConfig(): Promise<OpiniaoConfig> {
  const consultorId = resolveConsultorId();
  try {
    const snap = await getDoc(doc(db, CONFIG_COLLECTION, docIdOpiniaoItens(consultorId)));
    if (snap.exists()) {
      const data = snap.data() as { itens?: string[]; perguntaAberta?: string };
      return {
        itens: Array.isArray(data.itens) && data.itens.length > 0 ? data.itens : DEFAULT_ITENS,
        perguntaAberta: String(data.perguntaAberta || DEFAULT_PERGUNTA_ABERTA),
      };
    }
  } catch (e) {
    console.error('[opiniaoService] getOpiniaoItens erro, usando default:', e);
  }
  return { itens: DEFAULT_ITENS, perguntaAberta: DEFAULT_PERGUNTA_ABERTA };
}

export async function saveOpiniaoItens(itens: string[]): Promise<void> {
  const config = await getOpiniaoConfig();
  await saveOpiniaoConfig(itens, config.perguntaAberta);
}

export async function saveOpiniaoConfig(itens: string[], perguntaAberta: string): Promise<void> {
  const consultorId = resolveConsultorId();
  const limpos = itens.map((i) => i.trim()).filter(Boolean);
  await setDoc(doc(db, CONFIG_COLLECTION, docIdOpiniaoItens(consultorId)), {
    itens: limpos,
    perguntaAberta: perguntaAberta.trim() || DEFAULT_PERGUNTA_ABERTA,
    consultorId,
    updatedAt: new Date().toISOString(),
  });
}

// ===================================================================================
// Registrar opinião do aluno
// ===================================================================================

export async function salvarOpiniao(op: Omit<Opiniao, 'id' | 'criadoEm' | 'mediaNota'>): Promise<void> {
  const notasValidas = op.notas.filter((n) => n.nota >= 1 && n.nota <= 5);
  const mediaNota = notasValidas.length
    ? notasValidas.reduce((s, n) => s + n.nota, 0) / notasValidas.length
    : 0;
  const payload: Omit<Opiniao, 'id'> = {
    ...op,
    consultorId: op.consultorId || resolveConsultorId(),
    mediaNota: Math.round(mediaNota * 100) / 100,
    criadoEm: new Date().toISOString(),
  };
  await addDoc(collection(db, OPINIOES_COLLECTION), payload);
}

// ===================================================================================
// Leitura (admin)
// ===================================================================================

export async function getTodasOpinioes(): Promise<Opiniao[]> {
  try {
    const q = query(collection(db, OPINIOES_COLLECTION), orderBy('criadoEm', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Opiniao, 'id'>) }));
  } catch (e) {
    // Se o índice de orderBy não existir, cai pra leitura simples.
    console.error('[opiniaoService] getTodasOpinioes com orderBy falhou, tentando sem:', e);
    const snap = await getDocs(collection(db, OPINIOES_COLLECTION));
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Opiniao, 'id'>) }));
    return list.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
  }
}
