/**
 * opiniaoService — depoimentos + avaliação (NPS interno) dos alunos.
 *
 * Fluxo: antes de fazer a prova de qualquer trilha, o aluno preenche um depoimento
 * obrigatório (educado): dá nota 1-5 para vários itens, escreve um comentário e
 * autoriza (ou não) a divulgação nas redes sociais.
 *
 * Persistência:
 *   - Firestore `opiniaoClientes/{autoId}` = uma opinião (por trilha, por aluno).
 *   - Firestore `config/opiniaoItens` = a LISTA de itens avaliados (editável pelo admin).
 *     Se não existir, usa DEFAULT_ITENS embutido.
 */

import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, doc, getDoc, setDoc, query, orderBy } from 'firebase/firestore';

export const OPINIOES_COLLECTION = 'opiniaoClientes';
export const OPINIAO_CONFIG_DOC = 'opiniaoItens'; // dentro da coleção 'config'
const CONFIG_COLLECTION = 'config';

/** Itens avaliados (nota 1-5). Editáveis pelo admin. Definidos pelo Israel: */
export const DEFAULT_ITENS: string[] = [
  'A didática do Israel',
  'O software estatístico LBW',
  'Os vídeos do treinamento',
  'O Israel digital (mentor)',
  'As ferramentas da qualidade disponíveis nas trilhas',
  'O suporte que oferecemos',
  'Avaliação geral do curso e da plataforma',
];

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
  notas: OpiniaoItemNota[];
  /** Média das notas (0..5), pré-calculada pra facilitar listagem/ordenação no admin. */
  mediaNota: number;
  comentario: string;
  autorizaDivulgacao: boolean;
  criadoEm: string;
}

// ===================================================================================
// Itens avaliados (config editável)
// ===================================================================================

export async function getOpiniaoItens(): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, CONFIG_COLLECTION, OPINIAO_CONFIG_DOC));
    if (snap.exists()) {
      const data = snap.data() as { itens?: string[] };
      if (Array.isArray(data.itens) && data.itens.length > 0) return data.itens;
    }
  } catch (e) {
    console.error('[opiniaoService] getOpiniaoItens erro, usando default:', e);
  }
  return DEFAULT_ITENS;
}

export async function saveOpiniaoItens(itens: string[]): Promise<void> {
  const limpos = itens.map((i) => i.trim()).filter(Boolean);
  await setDoc(doc(db, CONFIG_COLLECTION, OPINIAO_CONFIG_DOC), {
    itens: limpos, updatedAt: new Date().toISOString(),
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
