import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Initiative, InitiativePhaseConfig } from '../types';

const INITIATIVES_COLLECTION = 'initiatives';
const CONFIG_COLLECTION = 'initiative_configs';

export const getInitiatives = async (): Promise<Initiative[]> => {
  const snapshot = await getDocs(collection(db, INITIATIVES_COLLECTION));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Initiative));
};

export const getInitiative = async (id: string): Promise<Initiative | null> => {
  const docRef = doc(db, INITIATIVES_COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Initiative;
  }
  return null;
};

export const createInitiative = async (name: string, description?: string, parentId?: string): Promise<Initiative> => {
  const id = Math.random().toString(36).substr(2, 9);
  const initiative: Initiative = {
    id,
    name,
    createdAt: new Date().toISOString()
  };
  if (description) {
    initiative.description = description;
  }
  if (parentId) {
    initiative.parentId = parentId;
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

export const getInitiativeConfigs = async (initiativeId: string): Promise<InitiativePhaseConfig[]> => {
  const q = query(collection(db, CONFIG_COLLECTION), where('initiativeId', '==', initiativeId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as InitiativePhaseConfig);
};

export const saveInitiativeConfig = async (config: InitiativePhaseConfig): Promise<void> => {
  const docId = `${config.initiativeId}_${config.phaseId}`;
  await setDoc(doc(db, CONFIG_COLLECTION, docId), config);
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
    { phaseId: 'Define', toolIds: ['brief', 'charter', 'sipoc', 'timeline', 'detailedTimeline', 'stakeholders', 'improvementPlan'] },
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
