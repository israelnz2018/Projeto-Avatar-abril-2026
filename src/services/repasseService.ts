/**
 * repasseService — controle do repasse B2B do consultor pro Israel.
 * Um doc por EMPRESA (repasses/{empresaId}): valor do negócio (NF), cronograma de
 * parcelas (espelha o do consultor) e a TRAVA do certificado.
 *
 * Regra de negócio: o certificado dos alunos daquela empresa só é emitido quando
 * `certificadoLiberado === true` (Israel marca quando recebe). Ver a trava em
 * videoProgressService.checkAndIssueCertificate.
 */
import { db } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';

export interface RepasseParcela {
  vencimento: string | null;
  valor: number;      // valor da parcela que o CONSULTOR recebe
  recebido: boolean;  // Israel já recebeu os 10% desta parcela?
}

export interface Repasse {
  empresaId: string;
  consultorId: string;
  empresaNome: string;
  valorNota: number;          // valor total do negócio (base da NF)
  notaFiscalUrl: string;      // PDF da NF (lastro)
  parcelas: RepasseParcela[]; // cronograma espelhando o do consultor
  certificadoLiberado: boolean;
  atualizadoEm?: string;
}

const COL = 'repasses';

/** % do repasse que o consultor paga ao Israel. */
export const REPASSE_PCT = 0.10;

export async function getRepasse(empresaId: string): Promise<Repasse | null> {
  const snap = await getDoc(doc(db, COL, empresaId));
  return snap.exists() ? (snap.data() as Repasse) : null;
}

export async function getTodosRepasses(consultorId?: string): Promise<Record<string, Repasse>> {
  const ref = collection(db, COL);
  const snap = await getDocs(consultorId ? query(ref, where('consultorId', '==', consultorId)) : ref);
  const out: Record<string, Repasse> = {};
  snap.docs.forEach((d) => { out[d.id] = d.data() as Repasse; });
  return out;
}

export async function salvarRepasse(r: Repasse): Promise<void> {
  await setDoc(doc(db, COL, r.empresaId), { ...r, atualizadoEm: new Date().toISOString() }, { merge: true });
}
