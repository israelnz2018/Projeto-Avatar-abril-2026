import { ref, uploadBytes, getStorage, getBytes } from 'firebase/storage';
import { doc, updateDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { saveProjectToolData, getProjectToolData } from './projectService';

const storage = getStorage(undefined, 'gs://senha-92ce1.firebasestorage.app');
const TAMANHO_MAXIMO_MB = 5;
const TAMANHO_MAXIMO_BYTES = TAMANHO_MAXIMO_MB * 1024 * 1024;

export interface PlanilhaInfo {
  url: string;
  nome: string;
  tamanho: number;
  atualizadaEm: any;
}

export interface GraficoPersonalizacao {
  titulo: string;
  tituloX: string;
  tituloY: string;
  corBarras: string;
  tamanhoFonte: number;
  rotacaoX: number;
  coresPizza: string[];
  mostrarTendencia: boolean;
  mostrarMedia: boolean;
}

export interface AnaliseSalva {
  id: string;
  tool: string;
  toolParams: Record<string, any>;
  selectedSheet: string;
  analise?: string;
  grafico_base64?: string;
  grafico_isolado_base64?: string | string[];
  /** Captura do gráfico Plotly exibido ao aluno; usada pelo PowerPoint. */
  graficoPptBase64?: string;
  /** Personalização individual desta análise, persistida junto com o projeto. */
  configGrafico?: GraficoPersonalizacao;
  interpretacao?: string;
  qa: { question: string; answer: string }[];
  timestamp: number;
  planilhaVersao: number | null;
  graficoInterativo?: any;
}

// ============== PLANILHA ==============

export const salvarPlanilhaProjeto = async (
  projectId: string,
  arquivo: File
): Promise<PlanilhaInfo> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');

  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new Error(
      `Arquivo muito grande. Limite: ${TAMANHO_MAXIMO_MB} MB. Seu arquivo: ${(arquivo.size / 1024 / 1024).toFixed(2)} MB.`
    );
  }

  const extensao = arquivo.name.split('.').pop() || 'xlsx';
  const caminho = `projects/${projectId}/spreadsheet/planilha.${extensao}`;
  const storageRef = ref(storage, caminho);

  const snapshot = await uploadBytes(storageRef, arquivo);
  const bucketName = 'senha-92ce1.firebasestorage.app';
  const caminhoEncodado = encodeURIComponent(caminho);
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${caminhoEncodado}?alt=media`;

  const projectRef = doc(db, 'projects', projectId);
  await updateDoc(projectRef, {
    planilhaUrl: url,
    planilhaNome: arquivo.name,
    planilhaTamanho: arquivo.size,
    planilhaAtualizadaEm: serverTimestamp(),
  });

  return {
    url,
    nome: arquivo.name,
    tamanho: arquivo.size,
    atualizadaEm: null,
  };
};

export const obterPlanilhaProjeto = async (projectId: string): Promise<PlanilhaInfo | null> => {
  const projectRef = doc(db, 'projects', projectId);
  const docSnap = await getDoc(projectRef);
  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  if (!data.planilhaUrl) return null;

  return {
    url: data.planilhaUrl,
    nome: data.planilhaNome || 'planilha.xlsx',
    tamanho: data.planilhaTamanho || 0,
    atualizadaEm: data.planilhaAtualizadaEm || null,
  };
};

// ============== ANÁLISES ==============

export const salvarAnalises = async (
  projectId: string,
  analises: AnaliseSalva[],
  planilhaTimestamp: number | null
): Promise<void> => {
  const conteudo = {
    analises,
    planilhaVersao: planilhaTimestamp,
  };
  await saveProjectToolData(projectId, 'dataAnalysis', conteudo);
};

export const carregarAnalises = async (
  projectId: string
): Promise<{ analises: AnaliseSalva[]; planilhaVersao: number | null } | null> => {
  const data = await getProjectToolData(projectId, 'dataAnalysis');
  if (!data) return null;
  return {
    analises: data.analises || [],
    planilhaVersao: data.planilhaVersao || null,
  };
};

export const baixarPlanilhaProjeto = async (
  projectId: string,
  planilhaInfo: PlanilhaInfo
): Promise<File> => {
  const extensao = planilhaInfo.nome.split('.').pop() || 'xlsx';
  const caminho = `projects/${projectId}/spreadsheet/planilha.${extensao}`;
  const storageRef = ref(storage, caminho);

  const arrayBuffer = await getBytes(storageRef);

  return new File([arrayBuffer], planilhaInfo.nome, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    lastModified: Date.now(),
  });
};
