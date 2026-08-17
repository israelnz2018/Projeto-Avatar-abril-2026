import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Initiative, InitiativePhaseConfig } from '../types';
import { updateCourseName, countVideosByCourse } from './knowledgeService';
import { resolveConsultorId } from './consultorService';

const INITIATIVES_COLLECTION = 'initiatives';
const CONFIG_COLLECTION = 'initiative_configs';

export const getInitiatives = async (): Promise<Initiative[]> => {
  const snapshot = await getDocs(collection(db, INITIATIVES_COLLECTION));
  // Multi-tenant: cada consultor vê só as metodologias dele. Trilhas antigas sem
  // consultorId contam como 'israel' (não somem no app. atual).
  const cid = resolveConsultorId();
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as Initiative))
    .filter(i => ((i as any).consultorId || 'israel') === cid);
};

/** Catálogo de cursos: tipos marcados somente como projeto ficam fora. */
export const getCourses = async (): Promise<Initiative[]> => {
  const initiatives = await getInitiatives();
  return initiatives.filter((initiative) => !initiative.somenteProjeto);
};

/** Catálogo de tipos de projeto, incluindo tipos que não são cursos. */
export const getProjectTypes = async (): Promise<Initiative[]> => {
  const initiatives = await getInitiatives();
  return initiatives.filter((initiative) => initiative.temProjeto !== false);
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
  ordem?: number
): Promise<Initiative> => {
  const id = crypto.randomUUID();
  const initiative: Initiative = {
    id,
    name,
    createdAt: new Date().toISOString(),
    consultorId: resolveConsultorId(), // metodologia pertence ao consultor atual
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

export const updateInitiative = async (id: string, updates: Partial<Initiative>): Promise<void> => {
  const docRef = doc(db, INITIATIVES_COLLECTION, id);
  await setDoc(docRef, updates, { merge: true });
};

export const deleteInitiative = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, INITIATIVES_COLLECTION, id));
  // Also delete associated configs
  const configs = await getInitiativeConfigs(id);
  for (const config of configs) {
    await deleteDoc(doc(db, CONFIG_COLLECTION, `${id}_${config.phaseId}`));
  }
};

/**
 * Funde uma iniciativa (source) em outra (target).
 *
 * Operação atômica em 3 passos:
 *   1. Move todos os vídeos da Base de Conhecimento da source pra target
 *      (renomeia o campo `course` em batch via updateCourseName).
 *   2. Deleta a Initiative source e suas configs (phaseId+toolIds).
 *   3. (Opcional) Renomeia a target se newTargetName for passado.
 *
 * Uso típico: admin acabou de fundir 2 trilhas conceitualmente (ex: T1+T2)
 * e precisa propagar a fusão nos dados do Firestore. Esta função executa os
 * 3 passos manuais que antes o admin fazia pelo painel — em 1 chamada.
 *
 * NÃO faz dry-run. Operação destrutiva da source. Sempre confirme com o
 * usuário antes de chamar (ver UI em ProjectToolsConfig.tsx).
 *
 * @param sourceId   ID da Initiative que vai SUMIR (toda a essência vai pra target)
 * @param targetId   ID da Initiative que RECEBE (sobrevive ao final)
 * @param newTargetName  (opcional) novo nome pra target depois da fusão.
 *                       Se passado, propaga pros vídeos também.
 * @returns número de vídeos movidos
 */
export const mergeInitiativeInto = async (
  sourceId: string,
  targetId: string,
  newTargetName?: string
): Promise<number> => {
  if (sourceId === targetId) {
    throw new Error('Source e target não podem ser a mesma iniciativa.');
  }

  // Carrega ambas — falha cedo se uma não existe
  const [source, target] = await Promise.all([
    getInitiative(sourceId),
    getInitiative(targetId),
  ]);
  if (!source) throw new Error(`Initiative source (${sourceId}) não encontrada.`);
  if (!target) throw new Error(`Initiative target (${targetId}) não encontrada.`);

  // 1. Move vídeos: source.name → target.name (ou newTargetName se passado)
  const finalTargetName = newTargetName?.trim() || target.name;
  const videosMoved = await countVideosByCourse(source.name);
  if (videosMoved > 0) {
    await updateCourseName(source.name, finalTargetName);
  }

  // 2. Se admin pediu renomear target, propaga pros vídeos que JÁ eram dela
  if (newTargetName && newTargetName.trim() !== target.name) {
    await updateCourseName(target.name, newTargetName.trim());
    await updateInitiative(targetId, { name: newTargetName.trim() });
  }

  // 3. Deleta source (Initiative + configs)
  await deleteInitiative(sourceId);

  return videosMoved;
};

/**
 * Conta quantos vídeos serão movidos numa fusão antes de executá-la.
 * Usado pra mostrar preview no modal de confirmação.
 */
export const previewMergeImpact = async (sourceId: string): Promise<{ videosCount: number; sourceName: string }> => {
  const source = await getInitiative(sourceId);
  if (!source) throw new Error(`Initiative source (${sourceId}) não encontrada.`);
  const videosCount = await countVideosByCourse(source.name);
  return { videosCount, sourceName: source.name };
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

export const getInitiativeConfigs = async (initiativeId: string): Promise<InitiativePhaseConfig[]> => {
  const q = query(collection(db, CONFIG_COLLECTION), where('initiativeId', '==', initiativeId));
  const snapshot = await getDocs(q);
  const cid = resolveConsultorId();
  return snapshot.docs
    .map(doc => doc.data() as InitiativePhaseConfig)
    .filter(c => ((c as any).consultorId || 'israel') === cid);
};

export const saveInitiativeConfig = async (config: InitiativePhaseConfig): Promise<void> => {
  const docId = `${config.initiativeId}_${config.phaseId}`;
  await setDoc(doc(db, CONFIG_COLLECTION, docId), { ...config, consultorId: config.consultorId || resolveConsultorId() });
};

export const restoreDefaultMethodologies = async (availableTools: any[]): Promise<void> => {
  const initiatives = await getInitiatives();
  for (const initiative of initiatives) {
    await deleteInitiative(initiative.id);
  }
  await seedDefaultInitiative(availableTools);
};

export const seedDefaultInitiative = async (availableTools: any[]): Promise<void> => {
  const initiatives = await getInitiatives();
  
  // Check if we already have the structure
  if (initiatives.length > 0) return;

  // 1. Create Root: Projeto de Melhoria
  const root = await createInitiative('1 - Projeto de Melhoria', 'Metodologias de melhoria contínua');
  
  // 1.1 Pequenas melhorias (ver e agir)
  const smallImprovements = await createInitiative(
    '1.1 Pequenas melhorias (ver e agir)', 
    'Ciclo rápido de melhoria', 
    root.id
  );
  
  const smallPhases = [
    { id: 'Identificar', name: 'Identificar o problema' },
    { id: 'Implementar', name: 'Implementar a solução' },
    { id: 'Controle', name: 'Controle da melhoria' }
  ];
  
  await updateInitiative(smallImprovements.id, { phases: smallPhases });
  
  // Assign some default tools to small improvements phases
  await saveInitiativeConfig({ initiativeId: smallImprovements.id, phaseId: 'Identificar', toolIds: ['brief', 'brainstorming', 'rab', 'gut', 'effortImpact', 'improvementPlan'] });
  await saveInitiativeConfig({ initiativeId: smallImprovements.id, phaseId: 'Implementar', toolIds: ['plan5w2h'] });
  await saveInitiativeConfig({ initiativeId: smallImprovements.id, phaseId: 'Controle', toolIds: ['sop'] });

  // 1.2 Projetos Lean Six Sigma
  const leanSixSigma = await createInitiative(
    '1.2 Projetos Lean Six Sigma', 
    'Metodologia DMAIC completa', 
    root.id
  );
  
  const dmaicPhases = [
    { id: 'PreDefinir', name: 'Pre-Definir' },
    { id: 'Define', name: 'Define' },
    { id: 'Measure', name: 'Measure' },
    { id: 'Analyze', name: 'Analyze' },
    { id: 'Improve', name: 'Improve' },
    { id: 'Control', name: 'Control' }
  ];
  
  await updateInitiative(leanSixSigma.id, { phases: dmaicPhases });

  // Assign DMAIC tools explicitly
  const dmaicConfigs = [
    { phaseId: 'PreDefinir', toolIds: ['improvementIdea'] },
    { phaseId: 'Define', toolIds: ['brief', 'charter', 'stakeholderAdkar', 'sipoc', 'timeline', 'detailedTimeline', 'stakeholders', 'improvementPlan'] },
    { phaseId: 'Measure', toolIds: ['processMap', 'brainstorming', 'measureIshikawa', 'measureMatrix', 'beforeAfter', 'rab', 'gut', 'effortImpact', 'dataCollection', 'processCanva', 'processModeling', 'processValidation', 'riskManagementPMI'] },
    { phaseId: 'Analyze', toolIds: ['vsm', 'directObservation', 'fiveWhys', 'fta', 'statisticalAnalysis', 'dataNature'] },
    { phaseId: 'Improve', toolIds: ['fmea', 'plan5w2h', 'actionPlan'] },
    { phaseId: 'Control', toolIds: ['sop', 'riskMonitoringPMI'] }
  ];

  for (const config of dmaicConfigs) {
    await saveInitiativeConfig({
      initiativeId: leanSixSigma.id,
      phaseId: config.phaseId,
      toolIds: config.toolIds
    });
  }

  // 1.3 Projeto Tradicional (PMI)
  const traditionalProject = await createInitiative(
    '1.3 Projeto Tradicional (PMI)', 
    'Gestão de projetos baseada no PMBOK/PMI', 
    root.id
  );
  
  const pmiPhases = [
    { id: 'Iniciação', name: 'Iniciação' },
    { id: 'Planejamento', name: 'Planejamento' },
    { id: 'Execução', name: 'Execução' },
    { id: 'Monitoramento', name: 'Monitoramento & Controle' },
    { id: 'Encerramento', name: 'Encerramento' }
  ];
  
  await updateInitiative(traditionalProject.id, { phases: pmiPhases });

  // Assign PMI tools
  await saveInitiativeConfig({ initiativeId: traditionalProject.id, phaseId: 'Iniciação', toolIds: ['brief', 'projectCharterPMI', 'stakeholderAnalysisPMI', 'gpPlanPMI'] });
  await saveInitiativeConfig({ initiativeId: traditionalProject.id, phaseId: 'Planejamento', toolIds: ['wbs', 'timeline', 'detailedTimeline', 'plan5w2h', 'riskManagementPMI'] });
  await saveInitiativeConfig({ initiativeId: traditionalProject.id, phaseId: 'Execução', toolIds: ['dataCollection'] });
  await saveInitiativeConfig({ initiativeId: traditionalProject.id, phaseId: 'Monitoramento', toolIds: ['pareto', 'riskMonitoringPMI'] });
  await saveInitiativeConfig({ initiativeId: traditionalProject.id, phaseId: 'Encerramento', toolIds: ['sop'] });
};
