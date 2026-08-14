/**
 * dashboardDataService — Camada de leitura resiliente para os Dashboards.
 *
 * Princípio único: ESTE ARQUIVO NUNCA CHUMBA NADA.
 * - Quais trilhas existem? Lê de `initiatives` em runtime.
 * - Quais ferramentas estão em qual trilha? Lê de `initiative_configs` em runtime.
 * - Quais vídeos pertencem a qual trilha? Match `knowledge_base.course === initiative.name`
 *   (mesma regra que LearningView usa).
 * - Quais ferramentas/trilhas o usuário tem acesso? Aplica a mesma lógica de
 *   useUserAccess (plano completo libera tudo; gratuito libera só initiatives `isFree`).
 *
 * Quando você renomear trilhas, adicionar vídeos, trocar ferramentas de fase,
 * mudar quem é gratuito vs pago — o Dashboard reflete sozinho no próximo refresh.
 */

import {
  collection, getDocs, doc, getDoc, query, where,
  orderBy, limit as fsLimit, Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getUserProgress } from './videoProgressService';
import { getInitiativeConfigs } from './configService';
import { getEducationCourses } from './educationCourseService';
import { getUserData, getUserDocsByConsultor, getUsersByEmpresa, userDataNoConsultor, UserData } from './userService';
import { Initiative, Project } from '../types';
import { KnowledgeEntry, KNOWLEDGE_COLLECTION } from './knowledgeService';
import { resolveConsultorId } from './consultorService';
import { hasCourseAccess } from '../lib/courseAccess';

const PROJECTS_COLLECTION = 'projects';
const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

// ---------- Tipos públicos do dashboard ----------

export interface UserContentScope {
  /** Trilhas que o usuário tem acesso hoje */
  initiatives: Initiative[];
  /** IDs de ferramentas acessíveis (união dos `initiative_configs.toolIds` das trilhas acessíveis) */
  toolIds: Set<string>;
  /** IDs de vídeos acessíveis (filtra knowledge_base por course === initiative.name) */
  videoIds: Set<string>;
  /** Total de trilhas que existem no sistema hoje (acessíveis + bloqueadas) */
  totalInitiatives: number;
  /** Total de cursos que o usuário ainda não pode acessar. */
  initiativesBloqueadas: number;
}

export interface UserUsageStats {
  projetos: {
    total: number;
    porFase: Record<string, number>;
    travados: number; // sem update há >7 dias
  };
  ferramentas: {
    /** Ferramentas no escopo do usuário hoje */
    disponiveis: number;
    /** Ferramentas que ele completou em qualquer projeto (∩ escopo) */
    completadas: number;
    /** Ferramentas completadas que NÃO estão mais no escopo (mudança de plano/trilha) */
    legadas: number;
  };
  videos: {
    /** Vídeos no escopo do usuário hoje */
    disponiveis: number;
  };
  creditoIA: {
    limite: number;
    usado: number;
    diasParaReset: number;
  };
}

export interface ResumoAluno {
  user: UserData;
  projetoAtual: Project | null;
  ultimoUpdate: number; // ms since epoch (0 se nunca)
  travado: boolean;
  iaUsado: number;
  iaLimite: number;
}

// ---------- Helpers internos ----------

/**
 * Replica a lógica de useUserAccess para decidir se uma initiative está acessível.
 * Mantém em sync com `useUserAccess.canUseInitiative`.
 */
function canAccessInitiative(
  initiative: Initiative,
  user: UserData,
): boolean {
  if (user.tipoUsuario === 'admin' || user.tipoUsuario === 'consultor') return true;
  const agora = Date.now();
  const cursosAtivos = (user.cursosAcesso || [])
    .filter((item) => !item.vencimento || new Date(item.vencimento).getTime() >= agora)
    .map((item) => item.curso);
  if (Array.isArray(user.cursosAcesso)) return hasCourseAccess(cursosAtivos, initiative.name);
  if ((user.cursosLiberados || []).length > 0) return hasCourseAccess(user.cursosLiberados, initiative.name);
  return false;
}

async function getAllInitiatives(): Promise<Initiative[]> {
  return getEducationCourses();
}

/** Lê todos os vídeos. Cacheável depois — por enquanto leitura direta. */
async function getAllVideos(): Promise<KnowledgeEntry[]> {
  const snapshot = await getDocs(collection(db, KNOWLEDGE_COLLECTION));
  return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as KnowledgeEntry) }));
}

/** Projetos de um uid específico. NÃO usa `auth.currentUser` — aceita qualquer uid (coordenador olhando time). */
async function getProjectsByOwner(uid: string): Promise<Project[]> {
  const q = query(collection(db, PROJECTS_COLLECTION), where('ownerUid', '==', uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Project[];
}

/** Última `updatedAt` entre os subdocs `projects/{id}/data/*`. Indica atividade real no projeto. */
async function getLastProjectActivityMs(projectId: string): Promise<number> {
  try {
    const snapshot = await getDocs(collection(db, PROJECTS_COLLECTION, projectId, 'data'));
    let maxMs = 0;
    snapshot.forEach(d => {
      const t = (d.data() as any).updatedAt;
      const ms = t?.toMillis ? t.toMillis() : (t?.seconds ? t.seconds * 1000 : 0);
      if (ms > maxMs) maxMs = ms;
    });
    return maxMs;
  } catch {
    return 0;
  }
}

function diasParaReset(resetEmIso: string | undefined): number {
  if (!resetEmIso) return 0;
  const reset = new Date(resetEmIso).getTime();
  const agora = Date.now();
  const diff = reset - agora;
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

// ---------- API pública ----------

/**
 * Retorna o universo de conteúdo (trilhas, ferramentas, vídeos) acessível ao
 * usuário NESTE momento. Tudo lido em runtime — se você mudar qualquer coisa
 * no Firestore amanhã, esta função reflete sozinha.
 */
export async function getUserContentScope(uid: string): Promise<UserContentScope> {
  const userGlobal = await getUserData(uid);
  if (!userGlobal) {
    return {
      initiatives: [],
      toolIds: new Set(),
      videoIds: new Set(),
      totalInitiatives: 0,
      initiativesBloqueadas: 0,
    };
  }
  const user = userDataNoConsultor(userGlobal, resolveConsultorId()) as UserData;

  const allInitiatives = await getAllInitiatives();
  const accessibleInitiatives = allInitiatives.filter(i => canAccessInitiative(i, user));

  // União de toolIds nas trilhas acessíveis
  const toolIds = new Set<string>();
  for (const initiative of accessibleInitiatives) {
    const configs = await getInitiativeConfigs(initiative.id);
    configs.forEach(c => (c.toolIds || []).forEach(id => toolIds.add(id)));
  }

  // Vídeos: pertencem à trilha se `course` bate com `initiative.name` (mesma regra do LearningView)
  const accessibleNames = new Set(accessibleInitiatives.map(i => i.name));
  const allVideos = await getAllVideos();
  const videoIds = new Set<string>();
  allVideos.forEach(v => {
    if (v.id && accessibleNames.has(v.course)) videoIds.add(v.id);
  });

  return {
    initiatives: accessibleInitiatives,
    toolIds,
    videoIds,
    totalInitiatives: allInitiatives.length,
    initiativesBloqueadas: allInitiatives.length - accessibleInitiatives.length,
  };
}

/**
 * Estatísticas de uso do usuário, intersecionadas com o escopo atual dele.
 * "Ferramentas legadas" são as que ele completou mas que SUMIRAM do escopo
 * (porque você reorganizou as trilhas). Não dão crash — viram contador separado.
 */
export async function getUserUsageStats(uid: string): Promise<UserUsageStats> {
  const user = await getUserData(uid);
  const scope = await getUserContentScope(uid);
  const projetos = await getProjectsByOwner(uid);

  const porFase: Record<string, number> = {};
  let travados = 0;
  const agora = Date.now();

  const completadasSet = new Set<string>();
  for (const p of projetos) {
    const fase = (p as any).currentPhase || 'Sem fase';
    porFase[fase] = (porFase[fase] || 0) + 1;

    const completed = (p as any).completedTools || [];
    completed.forEach((t: string) => completadasSet.add(t));

    const ultimoMs = await getLastProjectActivityMs(p.id);
    if (ultimoMs > 0 && agora - ultimoMs > SETE_DIAS_MS) travados++;
  }

  let completadasNoEscopo = 0;
  let legadas = 0;
  completadasSet.forEach(toolId => {
    if (scope.toolIds.has(toolId)) completadasNoEscopo++;
    else legadas++;
  });

  return {
    projetos: {
      total: projetos.length,
      porFase,
      travados,
    },
    ferramentas: {
      disponiveis: scope.toolIds.size,
      completadas: completadasNoEscopo,
      legadas,
    },
    videos: {
      disponiveis: scope.videoIds.size,
    },
    creditoIA: {
      limite: user?.creditoIA?.limite ?? 0,
      usado: user?.creditoIA?.usado ?? 0,
      diasParaReset: diasParaReset(user?.creditoIA?.resetEm),
    },
  };
}

/** Resumo leve de um aluno (pro Dashboard do Coordenador). Usa o projeto mais recentemente atualizado como "atual". */
export async function getResumoAluno(alunoUid: string): Promise<ResumoAluno | null> {
  const user = await getUserData(alunoUid);
  if (!user) return null;

  const projetos = await getProjectsByOwner(alunoUid);

  let projetoAtual: Project | null = null;
  let ultimoUpdate = 0;

  for (const p of projetos) {
    const ms = await getLastProjectActivityMs(p.id);
    if (ms > ultimoUpdate) {
      ultimoUpdate = ms;
      projetoAtual = p;
    }
  }
  // Fallback: se nenhum tem subdoc de atividade, pega o de createdAt mais recente
  if (!projetoAtual && projetos.length > 0) {
    projetoAtual = projetos.sort((a, b) => {
      const da = (a as any).createdAt?.seconds || 0;
      const db = (b as any).createdAt?.seconds || 0;
      return db - da;
    })[0];
  }

  const travado = ultimoUpdate > 0 && Date.now() - ultimoUpdate > SETE_DIAS_MS;

  return {
    user,
    projetoAtual,
    ultimoUpdate,
    travado,
    iaUsado: user.creditoIA?.usado ?? 0,
    iaLimite: user.creditoIA?.limite ?? 0,
  };
}

/**
 * Time do coordenador: alunos com mesmo `empresaId`, exceto o próprio coordenador.
 * Modelo atual do app (UserManagementView): vínculo via empresaId, sem campo `coordenadorId`.
 */
export async function getEquipeDoCoordenador(
  empresaId: string,
  coordenadorUid: string,
): Promise<UserData[]> {
  if (!empresaId) return [];
  const todos = await getUsersByEmpresa(empresaId);
  return todos.filter(u => u.uid !== coordenadorUid && u.tipoUsuario === 'aluno');
}

/** Resumo do time já com `getResumoAluno` aplicado em cada membro. */
export async function getResumoEquipe(
  empresaId: string,
  coordenadorUid: string,
): Promise<ResumoAluno[]> {
  const equipe = await getEquipeDoCoordenador(empresaId, coordenadorUid);
  const resumos = await Promise.all(equipe.map(u => getResumoAluno(u.uid)));
  return resumos.filter((r): r is ResumoAluno => r !== null);
}

// ---------- RESULTADOS (Ganhos Tangíveis) + engajamento por aluno ----------

/** Recalcula o ganho REAL e TEÓRICO acumulado a partir do toolData da ferramenta
 * Ganhos Tangíveis (mesma conta da aba Depois). Não chuma nada — lê o que o aluno salvou. */
function computeGanhos(d: any): { accReal: number; accTeo: number } {
  if (!d || typeof d !== 'object') return { accReal: 0, accTeo: 0 };
  const num = (s: any) => {
    if (typeof s === 'number') return s;
    if (s == null || s === '') return 0;
    const n = parseFloat(String(s).trim().replace(',', '.'));
    return isNaN(n) ? 0 : n;
  };
  const dir = d.direction === 'higher' ? -1 : 1;
  const padrao = num(d.custoPadrao ?? d.unitValue);
  const eff = (r: any) => (r?.custo !== '' && r?.custo != null ? num(r.custo) : padrao);
  const qty = (r: any) => (r?.mode === 'coef' ? num(r.coef) * num(r.volume) : r?.mode === 'direct' ? num(r?.value) : 0);
  const vm = (r: any) => (r?.mode === 'money' ? num(r?.valorRS) : qty(r) * eff(r));
  const has = (r: any) => (r?.mode === 'coef' ? r.coef !== '' && r.volume !== '' : r?.mode === 'direct' ? (r?.value !== '' && r?.value != null) : (r?.valorRS !== '' && r?.valorRS != null));
  const base: any[] = Array.isArray(d.baselineRows) ? d.baselineRows : [];
  const after: any[] = Array.isArray(d.afterRows) ? d.afterRows : [];
  const bQty: number[] = [], bCoef: number[] = [], bVal: number[] = [], bCusto: number[] = [];
  base.forEach((r) => {
    if (!has(r)) return;
    if (r.mode !== 'money') { bQty.push(qty(r)); bCusto.push(eff(r)); }
    if (r.mode === 'coef') bCoef.push(num(r.coef));
    bVal.push(vm(r));
  });
  const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  const qtyAvg = avg(bQty), coefAvg = bCoef.length ? avg(bCoef) : null, valAvg = avg(bVal), custoAvg = bCusto.length ? avg(bCusto) : padrao;
  const preco = d.precoCongelado !== '' && d.precoCongelado != null ? num(d.precoCongelado) : custoAvg;
  let accReal = 0, accTeo = 0;
  after.forEach((r) => {
    if (!has(r)) return;
    const c = eff(r);
    if (r.mode === 'money') { const g = dir * (valAvg - vm(r)); accReal += g; accTeo += g; return; }
    let gFis = 0;
    if (r.mode === 'coef' && coefAvg != null) gFis = dir * (coefAvg - num(r.coef)) * num(r.volume);
    else gFis = dir * (qtyAvg - qty(r));
    accTeo += gFis * preco;
    accReal += gFis * c;
  });
  return { accReal, accTeo };
}

export interface ResultadoAluno {
  uid: string;
  ganhoReal: number;
  ganhoTeo: number;
  projetosComGanho: { name: string; accReal: number; indicator: string }[];
  videosAssistidos: number;
  certificados: number;
}

/** Resultados (ganhos R$ dos projetos) + engajamento (vídeos, certificados) de um aluno. */
export async function getResultadoAluno(uid: string): Promise<ResultadoAluno> {
  const projetos = await getProjectsByOwner(uid);
  let ganhoReal = 0, ganhoTeo = 0;
  const projetosComGanho: { name: string; accReal: number; indicator: string }[] = [];
  for (const p of projetos) {
    try {
      const snap = await getDoc(doc(db, PROJECTS_COLLECTION, p.id, 'data', 'tangibleGains'));
      if (!snap.exists()) continue;
      const content = (snap.data() as any)?.content;
      const d = content?.toolData || content;
      const { accReal, accTeo } = computeGanhos(d);
      if (accReal !== 0 || accTeo !== 0) {
        ganhoReal += accReal;
        ganhoTeo += accTeo;
        projetosComGanho.push({ name: (p as any).name || 'Projeto', accReal, indicator: d?.indicator || '' });
      }
    } catch { /* projeto sem ganhos ou sem permissão — ignora */ }
  }
  let videosAssistidos = 0, certificados = 0;
  try {
    const prog = await getUserProgress(uid);
    videosAssistidos = Object.keys(prog.watchedUrls || {}).length;
    certificados = Object.keys(prog.certificadosEmitidos || {}).length;
  } catch { /* ignora */ }
  return { uid, ganhoReal, ganhoTeo, projetosComGanho, videosAssistidos, certificados };
}

/** Resultados + engajamento de todo o time do coordenador. */
export async function getResultadosEquipe(
  empresaId: string,
  coordenadorUid: string,
): Promise<ResultadoAluno[]> {
  const equipe = await getEquipeDoCoordenador(empresaId, coordenadorUid);
  return Promise.all(equipe.map(u => getResultadoAluno(u.uid)));
}

// ---------- Painel do CONSULTOR (agregado do mundo dele, por consultorId) ----------

export interface PainelConsultor {
  totalAlunos: number;
  ativos: number;
  totalProjetos: number;
  ganhoReal: number;
  ganhoTeo: number;
  videos: number;
  certificados: number;
  topProjetos: { name: string; accReal: number; indicator: string }[];
}

/**
 * Agrega o mundo de um consultor (por consultorId): alunos, projetos, ganho R$
 * (dos Ganhos Tangíveis) e engajamento (vídeos, certificados). Eficiente: lê os
 * projetos direto por consultorId (não varre aluno por aluno pra achar projeto).
 */
export async function getPainelConsultor(consultorId: string): Promise<PainelConsultor> {
  // Alunos do consultor (exclui o super-admin)
  const userDocs = await getUserDocsByConsultor(consultorId);
  const alunos = userDocs.map(d => ({ uid: d.id, ...(d.data() as any) })).filter(u => u.tipoUsuario !== 'admin');
  const totalAlunos = alunos.length;
  const ativos = alunos.filter(u => u.primeiroAcessoEm).length;

  // Projetos do consultor + ganhos (lê o tangibleGains de cada)
  const projSnap = await getDocs(query(collection(db, PROJECTS_COLLECTION), where('consultorId', '==', consultorId)));
  const projetos = projSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  let ganhoReal = 0, ganhoTeo = 0;
  const comGanho: { name: string; accReal: number; indicator: string }[] = [];
  await Promise.all(projetos.map(async (p) => {
    try {
      const snap = await getDoc(doc(db, PROJECTS_COLLECTION, p.id, 'data', 'tangibleGains'));
      if (!snap.exists()) return;
      const content = (snap.data() as any)?.content;
      const d = content?.toolData || content;
      const { accReal, accTeo } = computeGanhos(d);
      if (accReal !== 0 || accTeo !== 0) {
        ganhoReal += accReal; ganhoTeo += accTeo;
        comGanho.push({ name: p.name || 'Projeto', accReal, indicator: d?.indicator || '' });
      }
    } catch { /* projeto sem ganhos/sem permissão — ignora */ }
  }));
  comGanho.sort((a, b) => b.accReal - a.accReal);

  // Engajamento: vídeos assistidos + certificados (por aluno, em paralelo)
  let videos = 0, certificados = 0;
  await Promise.all(alunos.map(async (u) => {
    try {
      const prog = await getUserProgress(u.uid);
      videos += Object.keys(prog.watchedUrls || {}).length;
      certificados += Object.keys(prog.certificadosEmitidos || {}).length;
    } catch { /* ignora */ }
  }));

  return { totalAlunos, ativos, totalProjetos: projetos.length, ganhoReal, ganhoTeo, videos, certificados, topProjetos: comGanho.slice(0, 5) };
}

// ---------- Relatório SEGMENTADO do consultor (alunos diretos × empresas) ----------

export interface SegmentoRelatorio {
  /** 'diretos' ou o empresaId */
  chave: string;
  titulo: string;
  coordenadorNome?: string;
  totalAlunos: number;
  ativos: number;
  totalProjetos: number;
  ganhoReal: number;
  ganhoTeo: number;
  videos: number;
  certificados: number;
}

export interface RelatorioConsultor {
  /** Alunos diretos do consultor (sem empresa/coordenador) */
  diretos: SegmentoRelatorio;
  /** Um segmento por empresa (coordenador) */
  empresas: SegmentoRelatorio[];
}

/**
 * Igual ao getPainelConsultor, mas QUEBRA por segmento: alunos diretos do
 * consultor num bloco, e cada empresa (coordenador) num bloco próprio.
 * Attribui cada projeto ao segmento do seu dono (ownerUid → empresaId).
 */
export async function getRelatorioConsultor(consultorId: string): Promise<RelatorioConsultor> {
  const userDocs = await getUserDocsByConsultor(consultorId);
  const users = userDocs
    .map(d => ({ uid: d.id, ...(d.data() as any) }))
    .filter(u => u.tipoUsuario !== 'admin');

  // Chave de segmento por usuário: coordenador/aluno com empresaId → empresaId; senão → 'diretos'
  const segDe = (u: any): string =>
    u.empresaId ? String(u.empresaId) : 'diretos';

  // Nome de exibição de cada empresa (pega do coordenador, ou de qualquer user com empresaNome)
  const nomeEmpresa = new Map<string, string>();
  const nomeCoord = new Map<string, string>();
  users.forEach(u => {
    if (u.empresaId) {
      const nome = u.empresaNome || u.empresaId;
      if (!nomeEmpresa.has(u.empresaId)) nomeEmpresa.set(u.empresaId, nome);
      if (u.tipoUsuario === 'coordenador') {
        nomeEmpresa.set(u.empresaId, u.empresaNome || u.empresaId);
        nomeCoord.set(u.empresaId, u.nome || u.displayName || (u.email ? String(u.email).split('@')[0] : ''));
      }
    }
  });

  // Inicializa segmentos
  const mkSeg = (chave: string, titulo: string, coordenadorNome?: string): SegmentoRelatorio => ({
    chave, titulo, coordenadorNome,
    totalAlunos: 0, ativos: 0, totalProjetos: 0, ganhoReal: 0, ganhoTeo: 0, videos: 0, certificados: 0,
  });
  const segs = new Map<string, SegmentoRelatorio>();
  segs.set('diretos', mkSeg('diretos', 'Meus Alunos'));
  nomeEmpresa.forEach((nome, empId) => segs.set(empId, mkSeg(empId, nome, nomeCoord.get(empId))));

  // Conta alunos + ativos por segmento (só tipoUsuario 'aluno' conta como aluno)
  const uidSeg = new Map<string, string>();
  users.forEach(u => {
    const chave = segDe(u);
    uidSeg.set(u.uid, chave);
    const seg = segs.get(chave);
    if (!seg) return;
    if (u.tipoUsuario === 'aluno') {
      seg.totalAlunos++;
      if (u.primeiroAcessoEm) seg.ativos++;
    }
  });

  // Projetos do consultor → atribui ao segmento do dono + soma ganhos
  const projSnap = await getDocs(query(collection(db, PROJECTS_COLLECTION), where('consultorId', '==', consultorId)));
  const projetos = projSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  await Promise.all(projetos.map(async (p) => {
    const chave = uidSeg.get(p.ownerUid) || 'diretos';
    const seg = segs.get(chave);
    if (!seg) return;
    seg.totalProjetos++;
    try {
      const snap = await getDoc(doc(db, PROJECTS_COLLECTION, p.id, 'data', 'tangibleGains'));
      if (!snap.exists()) return;
      const content = (snap.data() as any)?.content;
      const d = content?.toolData || content;
      const { accReal, accTeo } = computeGanhos(d);
      seg.ganhoReal += accReal;
      seg.ganhoTeo += accTeo;
    } catch { /* sem ganhos/permissão — ignora */ }
  }));

  // Engajamento por usuário → soma no segmento dele
  await Promise.all(users.map(async (u) => {
    const seg = segs.get(uidSeg.get(u.uid) || 'diretos');
    if (!seg) return;
    try {
      const prog = await getUserProgress(u.uid);
      seg.videos += Object.keys(prog.watchedUrls || {}).length;
      seg.certificados += Object.keys(prog.certificadosEmitidos || {}).length;
    } catch { /* ignora */ }
  }));

  const empresas = Array.from(segs.values())
    .filter(s => s.chave !== 'diretos')
    .sort((a, b) => a.titulo.localeCompare(b.titulo));

  return { diretos: segs.get('diretos')!, empresas };
}

// ---------- Funções extras pros perfis Pago/Coordenador ----------

export interface ProgressoTrilha {
  initiative: Initiative;
  ferramentasFeitas: number;
  ferramentasTotais: number;
  videosTotais: number;
  /** True se o usuário ainda não tem acesso (pra exibir como bloqueada) */
  bloqueada: boolean;
}

/**
 * Retorna progresso por trilha pra o usuário. Inclui TODAS as trilhas que
 * existem hoje no sistema — as não acessíveis vêm marcadas como `bloqueada`.
 *
 * Para cada trilha: quantas ferramentas dela o usuário já completou em
 * qualquer um dos seus projetos.
 */
export async function getProgressoPorTrilha(uid: string): Promise<ProgressoTrilha[]> {
  const userGlobal = await getUserData(uid);
  if (!userGlobal) return [];
  const user = userDataNoConsultor(userGlobal, resolveConsultorId()) as UserData;

  const allInitiatives = await getAllInitiatives();
  const allVideos = await getAllVideos();
  const projetos = await getProjectsByOwner(uid);

  // União de completedTools em todos os projetos do usuário
  const completedSet = new Set<string>();
  projetos.forEach(p => {
    ((p as any).completedTools || []).forEach((t: string) => completedSet.add(t));
  });

  const resultados: ProgressoTrilha[] = [];
  for (const initiative of allInitiatives) {
    const configs = await getInitiativeConfigs(initiative.id);
    const toolIdsDaTrilha = new Set<string>();
    configs.forEach(c => (c.toolIds || []).forEach(id => toolIdsDaTrilha.add(id)));

    let feitas = 0;
    toolIdsDaTrilha.forEach(t => { if (completedSet.has(t)) feitas++; });

    const videosDaTrilha = allVideos.filter(v => v.course === initiative.name).length;

    resultados.push({
      initiative,
      ferramentasFeitas: feitas,
      ferramentasTotais: toolIdsDaTrilha.size,
      videosTotais: videosDaTrilha,
      bloqueada: !canAccessInitiative(initiative, user),
    });
  }

  return resultados;
}

export interface ProjetoComDetalhes {
  id: string;
  name: string;
  currentPhase: string;
  initiativeId: string | null;
  initiativeName: string | null;
  completedTools: string[];
  totalToolsNaIniciativa: number;
  ultimoUpdate: number;
  travado: boolean;
}

/** Projetos do usuário enriquecidos com progresso e nome da trilha. */
export async function getProjetosComDetalhes(uid: string): Promise<ProjetoComDetalhes[]> {
  const projetos = await getProjectsByOwner(uid);
  const allInitiatives = await getAllInitiatives();
  const initiativesMap = new Map(allInitiatives.map(i => [i.id, i]));

  const enriched: ProjetoComDetalhes[] = [];
  for (const p of projetos) {
    const initiativeId = (p as any).initiativeId || null;
    const initiative = initiativeId ? initiativesMap.get(initiativeId) : undefined;

    let totalTools = 0;
    if (initiativeId) {
      const configs = await getInitiativeConfigs(initiativeId);
      const toolIds = new Set<string>();
      configs.forEach(c => (c.toolIds || []).forEach(id => toolIds.add(id)));
      totalTools = toolIds.size;
    }

    const ultimoUpdate = await getLastProjectActivityMs(p.id);
    enriched.push({
      id: p.id,
      name: (p as any).name || 'Projeto sem nome',
      currentPhase: (p as any).currentPhase || 'Sem fase',
      initiativeId,
      initiativeName: initiative?.name || null,
      completedTools: (p as any).completedTools || [],
      totalToolsNaIniciativa: totalTools,
      ultimoUpdate,
      travado: ultimoUpdate > 0 && Date.now() - ultimoUpdate > SETE_DIAS_MS,
    });
  }

  return enriched.sort((a, b) => b.ultimoUpdate - a.ultimoUpdate);
}

// ---------- Funções pro Admin (agregados globais — não dependem de eventos) ----------

export interface AdminGlobalStats {
  usuarios: {
    total: number;
    porTipo: Record<string, number>;     // {aluno: 12, coordenador: 2, admin: 1}
    porPlano: Record<string, number>;    // {gratuito: 10, completo: 4, coordenador: 1}
    novosNoMes: number;
  };
  iaCredito: {
    /** Soma do creditoIA.usado de todos os usuários (mês corrente) */
    totalUsadoMes: number;
    /** Top consumidores */
    topConsumidores: Array<{ uid: string; nome: string; email: string; usado: number; limite: number }>;
  };
  projetos: {
    total: number;
    porFase: Record<string, number>;
  };
  conteudo: {
    totalInitiatives: number;
    totalVideos: number;
    totalCursos: number;     // courses únicos no knowledge_base
    totalPlaylists: number;  // playlists únicas
  };
}

export async function getAdminGlobalStats(): Promise<AdminGlobalStats> {
  // Usuários
  const usersSnap = await getDocs(collection(db, 'users'));
  const usuarios = usersSnap.docs.map(d => d.data() as UserData);
  const porTipo: Record<string, number> = {};
  const porPlano: Record<string, number> = {};
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  let novosNoMes = 0;
  let totalUsadoMes = 0;
  usuarios.forEach(u => {
    porTipo[u.tipoUsuario] = (porTipo[u.tipoUsuario] || 0) + 1;
    const plano = u.plano || 'gratuito';
    porPlano[plano] = (porPlano[plano] || 0) + 1;
    if (u.criadoEm && new Date(u.criadoEm) >= inicioMes) novosNoMes++;
    totalUsadoMes += u.creditoIA?.usado || 0;
  });

  const topConsumidores = usuarios
    .filter(u => (u.creditoIA?.usado || 0) > 0)
    .sort((a, b) => (b.creditoIA?.usado || 0) - (a.creditoIA?.usado || 0))
    .slice(0, 10)
    .map(u => ({
      uid: u.uid,
      nome: u.nome || u.email,
      email: u.email,
      usado: u.creditoIA?.usado || 0,
      limite: u.creditoIA?.limite || 0,
    }));

  // Projetos
  const projSnap = await getDocs(collection(db, PROJECTS_COLLECTION));
  const projsPorFase: Record<string, number> = {};
  projSnap.forEach(d => {
    const fase = (d.data() as any).currentPhase || 'Sem fase';
    projsPorFase[fase] = (projsPorFase[fase] || 0) + 1;
  });

  // Conteúdo
  const allInitiatives = await getAllInitiatives();
  const allVideos = await getAllVideos();
  const cursos = new Set<string>();
  const playlists = new Set<string>();
  allVideos.forEach(v => {
    if (v.course) cursos.add(v.course);
    if (v.playlist) playlists.add(`${v.course}::${v.playlist}`);
  });

  return {
    usuarios: {
      total: usuarios.length,
      porTipo,
      porPlano,
      novosNoMes,
    },
    iaCredito: {
      totalUsadoMes,
      topConsumidores,
    },
    projetos: {
      total: projSnap.size,
      porFase: projsPorFase,
    },
    conteudo: {
      totalInitiatives: allInitiatives.length,
      totalVideos: allVideos.length,
      totalCursos: cursos.size,
      totalPlaylists: playlists.size,
    },
  };
}

// ---------- Funções pro Admin sobre `eventos` (telemetria comportamental) ----------

const EVENTOS_COLLECTION = 'eventos';

export type EventType = 'tool_opened' | 'video_played' | 'ia_question' | 'analysis_run';

export interface EventoRaw {
  id: string;
  userId: string;
  userEmail?: string;
  type: EventType;
  payload: Record<string, any>;
  ts: number; // ms epoch
}

export interface TopAggregate {
  /** Chave do agregado (toolId, videoId, location, etc.) */
  key: string;
  /** Label legível pra UI (se diferente da chave) */
  label?: string;
  /** Total de eventos com essa chave */
  count: number;
  /** Usuários únicos */
  uniqueUsers: number;
}

export interface AdminEventStats {
  /** Total de eventos no período */
  totalEventos: number;
  /** Período em dias */
  diasPeriodo: number;
  /** Top ferramentas abertas */
  topFerramentas: TopAggregate[];
  /** Top vídeos tocados */
  topVideos: TopAggregate[];
  /** Top análises rodadas */
  topAnalises: TopAggregate[];
  /** Top locations de IA (chat-ai, mentor, fill-tool, etc.) */
  topIaLocations: TopAggregate[];
  /** Últimas perguntas pra IA (mais recentes primeiro, máx 30) */
  ultimasPerguntas: Array<{ ts: number; userEmail: string; location: string; question: string }>;
  /** Heatmap dia-da-semana (0=dom,6=sáb) × hora (0-23) → contagem */
  heatmap: number[][];
}

/**
 * Lê eventos dos últimos `dias` e agrega tudo client-side.
 * Performance: ok pra alguns milhares de eventos. Acima disso, vale agregar
 * via Cloud Function diária.
 */
export async function getAdminEventStats(dias: number = 30): Promise<AdminEventStats> {
  const desde = Date.now() - dias * 24 * 60 * 60 * 1000;
  const desdeTs = Timestamp.fromMillis(desde);

  const q = query(
    collection(db, EVENTOS_COLLECTION),
    where('ts', '>=', desdeTs),
    orderBy('ts', 'desc'),
    fsLimit(5000), // teto defensivo — admin com volume alto migra pra agregação server-side
  );
  const snap = await getDocs(q);

  const eventos: EventoRaw[] = snap.docs.map(d => {
    const data = d.data() as any;
    const tsRaw = data.ts;
    const ts = tsRaw?.toMillis ? tsRaw.toMillis() : (tsRaw?.seconds ? tsRaw.seconds * 1000 : Date.now());
    return {
      id: d.id,
      userId: data.userId || '',
      userEmail: data.userEmail || undefined,
      type: data.type,
      payload: data.payload || {},
      ts,
    };
  });

  // Agregadores
  const aggregate = (
    filterFn: (e: EventoRaw) => boolean,
    keyFn: (e: EventoRaw) => string | null,
    labelFn?: (e: EventoRaw) => string | undefined,
  ): TopAggregate[] => {
    const counts = new Map<string, { count: number; users: Set<string>; label?: string }>();
    eventos.filter(filterFn).forEach(e => {
      const key = keyFn(e);
      if (!key) return;
      const existing = counts.get(key) || { count: 0, users: new Set<string>() };
      existing.count++;
      existing.users.add(e.userId);
      if (labelFn && !existing.label) existing.label = labelFn(e);
      counts.set(key, existing);
    });
    return Array.from(counts.entries())
      .map(([key, v]) => ({ key, label: v.label, count: v.count, uniqueUsers: v.users.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const topFerramentas = aggregate(
    e => e.type === 'tool_opened',
    e => e.payload.toolId || null,
    e => e.payload.toolName,
  );
  const topVideos = aggregate(
    e => e.type === 'video_played',
    e => e.payload.videoId || null,
    e => e.payload.videoTitle,
  );
  const topAnalises = aggregate(
    e => e.type === 'analysis_run',
    e => e.payload.analysisType || null,
  );
  const topIaLocations = aggregate(
    e => e.type === 'ia_question',
    e => e.payload.location || null,
  );

  const ultimasPerguntas = eventos
    .filter(e => e.type === 'ia_question' && e.payload.question)
    .slice(0, 30)
    .map(e => ({
      ts: e.ts,
      userEmail: e.userEmail || '—',
      location: e.payload.location || '—',
      question: e.payload.question || '',
    }));

  // Heatmap 7×24
  const heatmap: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  eventos.forEach(e => {
    const d = new Date(e.ts);
    heatmap[d.getDay()][d.getHours()]++;
  });

  return {
    totalEventos: eventos.length,
    diasPeriodo: dias,
    topFerramentas,
    topVideos,
    topAnalises,
    topIaLocations,
    ultimasPerguntas,
    heatmap,
  };
}

// ---------- Funções pro Admin sobre `api_usage` e `feedback` ----------

export interface ApiUsageDia {
  data: string; // YYYY-MM-DD
  geminiCalls: number;
  anthropicCalls: number;
  geminiTokens: number;
  anthropicTokens: number;
  falhas: number;
}

/** Últimos N dias da coleção `api_usage`. */
export async function getApiUsageRecente(dias: number = 14): Promise<ApiUsageDia[]> {
  const snap = await getDocs(collection(db, 'api_usage'));
  const todos: ApiUsageDia[] = snap.docs.map(d => {
    const data = d.data() as any;
    return {
      data: d.id,
      geminiCalls: data.geminiCalls || 0,
      anthropicCalls: data.anthropicCalls || 0,
      geminiTokens: data.geminiTotalTokens || 0,
      anthropicTokens: data.anthropicTotalTokens || 0,
      falhas: (data.geminiFailures || 0) + (data.anthropicFailures || 0),
    };
  });
  return todos
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, dias)
    .reverse();
}

export interface FeedbackResumo {
  id: string;
  userEmail: string;
  tipo: string;
  mensagem: string;
  status: string;
  criadoEm: number;
}

/** Últimos N feedbacks. */
export async function getFeedbacksRecentes(limite: number = 10): Promise<FeedbackResumo[]> {
  try {
    const q = query(
      collection(db, 'feedback'),
      orderBy('criadoEm', 'desc'),
      fsLimit(limite),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as any;
      const criadoEmRaw = data.criadoEm;
      const criadoEm = criadoEmRaw?.toMillis
        ? criadoEmRaw.toMillis()
        : (typeof criadoEmRaw === 'string' ? new Date(criadoEmRaw).getTime() : 0);
      return {
        id: d.id,
        userEmail: data.userEmail || data.email || '—',
        tipo: data.tipo || data.type || '—',
        mensagem: data.mensagem || data.message || '',
        status: data.status || 'aberto',
        criadoEm,
      };
    });
  } catch (err) {
    // Coleção pode não existir ou não ter campo criadoEm ordenável — degrada pra []
    return [];
  }
}
