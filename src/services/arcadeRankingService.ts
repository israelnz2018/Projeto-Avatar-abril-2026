import { auth, db } from '../lib/firebase';
import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

const ARCADE_RANKING_COLLECTION = 'arcade_rankings';

export interface ArcadeRankingEntry {
  uid: string;
  nome: string;
  fase: 1 | 2 | 3 | 4;
  pontos: number;
  distancia: number;
}

export interface ArcadeScore {
  fase: 1 | 2 | 3 | 4;
  pontos: number;
  distancia: number;
}

function nomeDoUsuario(userData: any): string {
  const user = auth.currentUser;
  return String(userData?.nome || user?.displayName || user?.email?.split('@')[0] || 'Aluno LBW').trim();
}

function normalizarEntrada(id: string, data: any): ArcadeRankingEntry | null {
  const fase = Number(data?.fase);
  const pontos = Number(data?.pontos);
  const distancia = Number(data?.distancia || 0);
  if (!id || ![1, 2, 3, 4].includes(fase) || !Number.isFinite(pontos)) return null;
  return {
    uid: id,
    nome: String(data?.nome || 'Aluno LBW'),
    fase: fase as 1 | 2 | 3,
    pontos: Math.max(0, Math.floor(pontos)),
    distancia: Math.max(0, Math.floor(Number.isFinite(distancia) ? distancia : 0)),
  };
}

export function ordenarRanking(entries: ArcadeRankingEntry[]): ArcadeRankingEntry[] {
  return [...entries].sort((a, b) =>
    b.fase - a.fase || b.pontos - a.pontos || b.distancia - a.distancia || a.nome.localeCompare(b.nome, 'pt-BR'),
  );
}

export function assinarRankingArcade(
  onChange: (entries: ArcadeRankingEntry[]) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    collection(db, ARCADE_RANKING_COLLECTION),
    (snapshot) => {
      const entries = snapshot.docs
        .map((item) => normalizarEntrada(item.id, item.data()))
        .filter((item): item is ArcadeRankingEntry => Boolean(item));
      onChange(ordenarRanking(entries));
    },
    (error) => onError?.(error),
  );
}

export async function salvarMelhorResultadoArcade(score: ArcadeScore): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, ARCADE_RANKING_COLLECTION, user.uid);
  const atual = await getDoc(ref);
  const atualData = atual.exists() ? normalizarEntrada(user.uid, atual.data()) : null;
  const melhorQueAtual = !atualData
    || score.fase > atualData.fase
    || (score.fase === atualData.fase && score.pontos > atualData.pontos)
    || (score.fase === atualData.fase && score.pontos === atualData.pontos && score.distancia > atualData.distancia);

  if (!melhorQueAtual) return;

  let userData: any = null;
  try {
    const userSnap = await getDoc(doc(db, 'users', user.uid));
    userData = userSnap.exists() ? userSnap.data() : null;
  } catch {
    // O nome do ranking pode usar o perfil Auth mesmo se a leitura do perfil falhar.
  }

  await setDoc(ref, {
    uid: user.uid,
    nome: nomeDoUsuario(userData),
    fase: score.fase,
    pontos: Math.max(0, Math.floor(score.pontos)),
    distancia: Math.max(0, Math.floor(score.distancia)),
    atualizadoEm: serverTimestamp(),
  });
}
