import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  writeBatch,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import { ehCurso, ehTipoDeProjeto } from '../lib/tipoIniciativa';
import { db } from '../lib/firebase';
import { Initiative, InitiativePhaseConfig } from '../types';
import { resolveConsultorId } from './consultorService';
import { setCourseRegistry } from '../lib/courseRegistry';

const INITIATIVES_COLLECTION = 'initiatives';
const CONFIG_COLLECTION = 'initiative_configs';

export const getInitiatives = async (consultorIdOverride?: string): Promise<Initiative[]> => {
  const cid = consultorIdOverride || resolveConsultorId();

  // A CONSULTA VAI FILTRADA. Ler a coleção inteira e peneirar aqui no navegador
  // parece equivalente e não é: as regras do Firestore são por documento, e ele
  // RECUSA A CONSULTA INTEIRA quando não consegue provar de antemão que todos os
  // documentos podem ser lidos. Para o Israel passava — o admin tem exceção global
  // nas regras —, e para qualquer outro consultor a lista de cursos voltava vazia.
  //
  // Foi exatamente isso que fez "Meus Cursos" parecer que não salvava: o curso era
  // gravado sem erro e a lista nunca conseguia ler de volta.
  const snapshot = await getDocs(
    query(collection(db, INITIATIVES_COLLECTION), where('consultorId', '==', cid)),
  );
  const initiatives = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Initiative));

  // Trilhas antigas não têm consultorId e pertencem ao Israel. Não dá para pedir
  // "campo ausente" numa consulta, então elas vêm de uma leitura à parte — que só
  // o admin consegue fazer, e é justamente para ele que elas existem.
  if (cid === 'israel') {
    try {
      const legadas = await getDocs(collection(db, INITIATIVES_COLLECTION));
      const jaTem = new Set(initiatives.map(i => i.id));
      legadas.docs.forEach((doc) => {
        const dados = { id: doc.id, ...doc.data() } as Initiative;
        if (!jaTem.has(dados.id) && !(dados as any).consultorId) initiatives.push(dados);
      });
    } catch {
      // Consultor 'israel' que não seja admin simplesmente não vê as legadas.
    }
  }
  // Reindexa o registro canônico: é o que permite que qualquer referência gravada
  // por NOME (acessos do aluno, vídeos, materiais) continue apontando para o curso
  // certo mesmo depois de renomeado. Ver lib/courseRegistry.ts.
  setCourseRegistry(initiatives);
  return initiatives;
};

/** Catálogo de cursos: tipos marcados somente como projeto ficam fora. */
export const getCourses = async (consultorIdOverride?: string): Promise<Initiative[]> => {
  const initiatives = await getInitiatives(consultorIdOverride);
  return initiatives.filter(ehCurso);
};

/** Catálogo de tipos de projeto, incluindo tipos que não são cursos. */
export const getProjectTypes = async (consultorIdOverride?: string): Promise<Initiative[]> => {
  const initiatives = await getInitiatives(consultorIdOverride);
  return initiatives.filter(ehTipoDeProjeto);
};

/**
 * Renomear uma trilha quebra o vínculo de quem já tem esse curso liberado —
 * users/{uid}.cursosAcesso[].curso (e o legado cursosLiberados[]) guardam o
 * NOME do curso, não o id da iniciativa. Sem propagar, todo coordenador/aluno
 * que já tinha esse curso liberado passa a ver tudo bloqueado (o nome antigo
 * não bate com nenhuma iniciativa). Mesmo princípio do updateCourseName (que já
 * faz isso pros vídeos da Base de Conhecimento) — aqui é a mesma coisa pros acessos.
 */
export async function propagarRenomeacaoParaAcessos(oldName: string, newName: string, consultorId?: string): Promise<number> {
  const cid = consultorId || resolveConsultorId();
  // Vínculos antigos podem estar em consultorId ou no array consultorIds
  // (contas com mais de um papel/tenant). Atualize os dois formatos.
  const [principal, multi] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('consultorId', '==', cid))),
    getDocs(query(collection(db, 'users'), where('consultorIds', 'array-contains', cid))),
  ]);
  const docs = new Map<string, typeof principal.docs[number]>();
  [...principal.docs, ...multi.docs].forEach((d) => docs.set(d.id, d));
  const batch = writeBatch(db);
  let afetados = 0;
  docs.forEach((d) => {
    const data = d.data() as any;
    let mudou = false;
    const cursosAcesso = Array.isArray(data.cursosAcesso)
      ? data.cursosAcesso.map((c: any) => {
          if (c?.curso === oldName) { mudou = true; return { ...c, curso: newName }; }
          return c;
        })
      : null;
    const cursosLiberados = Array.isArray(data.cursosLiberados)
      ? data.cursosLiberados.map((c: string) => {
          if (c === oldName) { mudou = true; return newName; }
          return c;
        })
      : null;
    if (mudou) {
      afetados++;
      const updates: any = {};
      if (cursosAcesso) updates.cursosAcesso = cursosAcesso;
      if (cursosLiberados) updates.cursosLiberados = cursosLiberados;
      batch.update(d.ref, updates);
    }
  });
  if (afetados > 0) await batch.commit();
  return afetados;
}

export const getInitiative = async (id: string): Promise<Initiative | null> => {
  const docRef = doc(db, INITIATIVES_COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Initiative;
  }
  return null;
};

export const createInitiative = async (
  name: string,
  description?: string,
  parentId?: string,
  isFree?: boolean,
  ordem?: number,
  consultorIdOverride?: string,
): Promise<Initiative> => {
  const id = crypto.randomUUID();
  const initiative: Initiative = {
    id,
    name,
    createdAt: new Date().toISOString(),
    consultorId: consultorIdOverride || resolveConsultorId(), // metodologia pertence ao consultor atual
  };
  if (description) {
    initiative.description = description;
  }
  if (parentId) {
    initiative.parentId = parentId;
  }
  if (isFree !== undefined) {
    initiative.isFree = isFree;
  }
  if (ordem !== undefined) {
    initiative.ordem = ordem;
  }
  await setDoc(doc(db, INITIATIVES_COLLECTION, id), initiative);
  return initiative;
};

/**
 * Guarda o nome anterior da iniciativa antes de uma renomeação.
 *
 * É o que torna a renomeação inofensiva: tudo que ficou gravado com o nome antigo
 * (acessos do aluno, vídeos, materiais de apoio) continua resolvendo para esta
 * iniciativa através do registro canônico, sem precisar reescrever dado nenhum.
 */
export const registrarNomeAnterior = async (id: string, nomeAntigo: string): Promise<void> => {
  const nome = (nomeAntigo || '').trim();
  if (!id || !nome) return;
  try {
    await updateDoc(doc(db, INITIATIVES_COLLECTION, id), { nomesAnteriores: arrayUnion(nome) });
  } catch (error) {
    // Histórico é rede de segurança, não pré-requisito: se falhar, a renomeação
    // segue e a propagação por nome ainda cobre o caso comum.
    console.error('Não foi possível registrar o nome anterior da iniciativa', error);
  }
};

export const updateInitiative = async (id: string, updates: Partial<Initiative>): Promise<void> => {
  const docRef = doc(db, INITIATIVES_COLLECTION, id);
  await setDoc(docRef, updates, { merge: true });
};

/**
 * Grava as ligações entre ferramentas SUBSTITUINDO o mapa inteiro.
 * Não dá pra usar `updateInitiative` aqui: ele é `setDoc(merge: true)`, e o Firestore
 * funde mapas aninhados campo a campo — ligação removida pelo consultor sobreviveria
 * ao salvamento. `updateDoc` troca o valor do campo por inteiro, que é o que queremos.
 */
export const saveInitiativeToolLinks = async (
  id: string,
  toolLinks: Record<string, { from: string[]; mode: 'migrate' | 'ai' }>
): Promise<void> => {
  await updateDoc(doc(db, INITIATIVES_COLLECTION, id), { toolLinks });
};

export const deleteInitiative = async (id: string): Promise<void> => {
  const cid = resolveConsultorId();
  const configs = await getDocs(query(
    collection(db, CONFIG_COLLECTION),
    where('consultorId', '==', cid),
    where('initiativeId', '==', id),
  ));

  // A exclusão é atômica e usa o ID real de cada configuração. Registros antigos
  // nem sempre seguem o padrão `${initiativeId}_${phaseId}` no nome do documento.
  const batch = writeBatch(db);
  configs.docs.forEach((config) => batch.delete(config.ref));
  batch.delete(doc(db, INITIATIVES_COLLECTION, id));
  await batch.commit();
};

// ===== Ferramentas em RASCUNHO (não prontas pra distribuir aos consultores) =====
// Só o admin marca. Consultores não veem as ferramentas nesta lista.
// Doc: app_config/ferramentas { rascunhos: string[] }. Vazio = tudo pronto.
export const getFerramentasRascunho = async (): Promise<string[]> => {
  try {
    const snap = await getDoc(doc(db, 'app_config', 'ferramentas'));
    const arr = snap.exists() ? (snap.data() as any).rascunhos : null;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

export const toggleFerramentaRascunho = async (toolId: string, rascunho: boolean, atuais: string[]): Promise<string[]> => {
  const nova = rascunho
    ? Array.from(new Set([...atuais, toolId]))
    : atuais.filter(t => t !== toolId);
  await setDoc(doc(db, 'app_config', 'ferramentas'), { rascunhos: nova }, { merge: true });
  return nova;
};

export type ToolCategoryId = 'quality' | 'projects' | 'change';

// Organização GLOBAL do catálogo, definida somente pelo admin no app.*.
// Os sites dos consultores apenas leem e exibem essa organização.
export const getToolCategories = async (): Promise<Record<string, ToolCategoryId>> => {
  try {
    const snap = await getDoc(doc(db, 'app_config', 'ferramentas'));
    return (snap.data()?.categorias || {}) as Record<string, ToolCategoryId>;
  } catch {
    return {};
  }
};

export const saveToolCategories = async (categories: Record<string, ToolCategoryId>): Promise<void> => {
  await setDoc(doc(db, 'app_config', 'ferramentas'), { categorias: categories }, { merge: true });
};

export const getInitiativeConfigs = async (initiativeId: string, consultorIdOverride?: string): Promise<InitiativePhaseConfig[]> => {
  // Com o dono no filtro: sem ele, a regra não consegue provar que todos os
  // documentos são legíveis e recusa a consulta para quem não é admin.
  const q = query(
    collection(db, CONFIG_COLLECTION),
    where('consultorId', '==', resolveConsultorId()),
    where('initiativeId', '==', initiativeId),
  );
  const snapshot = await getDocs(q);
  const cid = consultorIdOverride || resolveConsultorId();
  return snapshot.docs
    .map(doc => doc.data() as InitiativePhaseConfig)
    .filter(c => ((c as any).consultorId || 'israel') === cid);
};

export const saveInitiativeConfig = async (config: InitiativePhaseConfig): Promise<void> => {
  const docId = `${config.initiativeId}_${config.phaseId}`;
  await setDoc(doc(db, CONFIG_COLLECTION, docId), { ...config, consultorId: config.consultorId || resolveConsultorId() });
};

/**
 * @deprecated Existia uma versão desta função que criava sozinha, sem avisar,
 * uma estrutura padrão (a metodologia de melhoria contínua do Israel) na conta
 * de todo consultor novo que abrisse "Meus Cursos" pela primeira vez. Foi assim
 * que a Mariana viu "um monte de cursos" que ela nunca criou.
 *
 * Não é vazamento entre consultores — a estrutura nascia com o `consultorId`
 * dela, não misturava dado de ninguém — mas acontecia em silêncio, sem pedir
 * nada, e o Israel pediu para nunca mais acontecer: "vc tem que deletar isso
 * de uma vez por todas, nunca criei isso". Removida também a chamada
 * automática em ProjectToolsConfig.tsx. Quem quiser essa estrutura monta à
 * mão pelo botão de criar iniciativa, que já existe na tela.
 */
