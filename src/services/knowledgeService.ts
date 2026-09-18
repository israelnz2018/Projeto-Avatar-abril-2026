import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, doc, deleteDoc, updateDoc, writeBatch, where } from 'firebase/firestore';
import { resolveConsultorId } from './consultorService';

export interface KnowledgeEntry {
  id?: string;
  title: string;
  content: string;
  sourceUrl: string;
  course: string;
  playlist: string;
  timestamp: Date;
  summary?: { time: string; topic: string }[];
  transcript?: string;
  rawTranscript?: string;
  /** Ferramentas associadas ao vídeo (ex: 'charter', 'sipoc') — usadas para sugerir vídeos contextuais quando o aluno abre uma ferramenta */
  associatedTools?: string[];
  /** Análises de dados associadas (ex: 'graficoSumario', 'analiseOutliers') — usadas para sugerir vídeos quando o aluno roda uma análise */
  associatedAnalyses?: string[];
  order?: number;
  playlistOrder?: number;
  /** Multi-tenant: dono do conteúdo (consultor). Default 'israel' na Fase 0. */
  consultorId?: string;
  // ===== Vídeo Bunny =====
  /** GUID do vídeo no Bunny Stream. Se presente, o player toca pelo Bunny. */
  bunnyVideoId?: string;
  /** ID da Video Library do Bunny (multi-tenant: uma por consultor). */
  bunnyLibraryId?: string;
  /** URL pública da thumbnail gerada pelo Bunny (preenchida no processamento automático). */
  bunnyThumbnailUrl?: string;
  /** Identificador estável da etapa do Consultor Comece por aqui. */
  onboardingStep?: string;
  transcricaoErro?: { mensagem?: string; ocorridoEm?: string };
  /** Estado das três etapas do processamento automático do vídeo. */
  pipelineStatus?: {
    processamentoVideo?: 'aguardando' | 'processando' | 'concluido' | 'erro';
    transcricao?: 'aguardando' | 'processando' | 'concluido' | 'erro';
    indice?: 'aguardando' | 'processando' | 'concluido' | 'erro';
    /** O que está acontecendo agora na etapa em curso, ex.: "codificação em 65%". */
    detalhe?: string;
    atualizadoEm?: string;
    erro?: {
      etapa?: 'processamentoVideo' | 'transcricao' | 'indice';
      mensagem?: string;
      ocorridoEm?: string;
    };
  };
  /** Metadados para comprovar a persistência da transcrição completa. */
  transcriptMeta?: {
    segmentCount?: number;
    characterCount?: number;
    savedAt?: string;
  };
}

export const KNOWLEDGE_COLLECTION = 'knowledge_base';

export const INTRO_COURSE_ALUNO = 'Aluno Comece por aqui';
export const INTRO_COURSE_COORDENADOR = 'Coordenador Comece por aqui';
/** Área de orientação do próprio consultor; não é curso nem aparece ao aluno. */
export const INTRO_COURSE_CONSULTOR = 'Consultor Comece por aqui';
export const INTRO_PLAYLIST = 'Comece por aqui';

export const INTRO_COURSES = [INTRO_COURSE_ALUNO, INTRO_COURSE_COORDENADOR, INTRO_COURSE_CONSULTOR] as const;

/** Playlists iniciais da aba especial. O consultor pode criar, renomear e
 * reorganizar outras playlists depois, como em qualquer lista de vídeos. */
const LEGACY_CONSULTOR_ONBOARDING_STEPS = [
  { id: 'boas-vindas', playlist: '1. Boas-vindas ao Programa de Consultores LBW' },
  { id: 'experiencia-aluno', playlist: '2. Conheça a plataforma como aluno' },
  { id: 'marca', playlist: '8. Como configurar sua marca' },
  { id: 'cursos', playlist: '3. Como cadastrar os seus cursos' },
  { id: 'projetos', playlist: '4. Como criar seus projetos por curso' },
  { id: 'avaliacao-certificado', playlist: '6. Como configurar a avaliação dos alunos e o certificado' },
  { id: 'clientes-alunos', playlist: '7. Como cadastrar clientes (empresas) e seus próprios alunos' },
  { id: 'comunidade', playlist: '8. Como criar sua própria comunidade' },
  { id: 'outros-consultores', playlist: '9. Como interagir com outros consultores' },
  { id: 'melhorar-plataforma', playlist: '9. Como ajudar a melhorar a plataforma' },
  { id: 'termos-gerais', playlist: '11. Termos de contrato e considerações gerais' },
] as const;

/**
 * As 14 etapas atuais \u2014 refeitas em 18/09/2026 para acompanhar os 12 v\u00eddeos que
 * o Israel gravou, casando 1:1 com os itens reais do menu do consultor de hoje
 * (Meu perfil, Meus Cursos, Projetos/Fases/Ferramentas, Modelo de PPT etc. \u2014 ver
 * a lista de navega\u00e7\u00e3o em App.tsx). Duas etapas ficam sem v\u00eddeo por enquanto,
 * ainda sendo gravadas: a 1 (boas-vindas) e a 2 (como o aluno v\u00ea a plataforma).
 */
export const CONSULTOR_ONBOARDING_STEPS = [
  { id: 'boas-vindas', playlist: '1. Boas-vindas ao Programa de Consultores LBW' },
  // Sem v\u00eddeo por enquanto: o Israel ainda vai gravar o de "como o aluno v\u00ea".
  { id: 'experiencia-aluno', playlist: '2. Conhe\u00e7a a plataforma como o aluno v\u00ea' },
  // Da\u00ed em diante, a ordem \u00e9 a CRONOL\u00d3GICA de grava\u00e7\u00e3o (hor\u00e1rio do arquivo em
  // Downloads, do primeiro ao \u00faltimo), confirmada pelo Israel \u2014 e n\u00e3o alfab\u00e9tica.
  { id: 'perfil', playlist: '3. Acesso \u00e0 plataforma e meu perfil' },
  { id: 'cursos', playlist: '4. Meus cursos' },
  { id: 'papeis', playlist: '5. Pap\u00e9is e responsabilidades' },
  { id: 'projetos', playlist: '6. Projetos, fases e ferramentas' },
  { id: 'associar-ferramentas', playlist: '7. Associar ferramentas e an\u00e1lises ao v\u00eddeo' },
  { id: 'avaliacao-certificado', playlist: '8. Teste de avalia\u00e7\u00e3o' },
  { id: 'certificados', playlist: '9. Certificados' },
  { id: 'material-apoio', playlist: '10. Material de apoio' },
  { id: 'marca', playlist: '11. Modelo de PPT' },
  { id: 'clientes-alunos', playlist: '12. Meus clientes' },
  { id: 'relatorios', playlist: '13. Relat\u00f3rios' },
  { id: 'comunicacao', playlist: '14. Comunidade e considera\u00e7\u00f5es finais' },
] as const;

export const CONSULTOR_ONBOARDING_PLAYLISTS = CONSULTOR_ONBOARDING_STEPS.map((item) => item.playlist);

export function consultorOnboardingStepId(playlist: string): string | undefined {
  const current = CONSULTOR_ONBOARDING_STEPS.find((item) => item.playlist === playlist)?.id;
  if (current) return current;

  // Mantém vídeos cadastrados antes da reorganização visíveis na nova etapa.
  if (playlist.startsWith('3. Como configurar sua marca')) return 'marca';
  if (playlist.startsWith('4. Como cadastrar os seus cursos')) return 'cursos';
  if (playlist.startsWith('5. Como criar seus projetos por curso')) return 'projetos';
  if (playlist.startsWith('6. Como configurar') && playlist.includes('certificado')) return 'avaliacao-certificado';
  if (playlist.startsWith('7. Como cadastrar clientes')) return 'clientes-alunos';
  if (playlist.startsWith('8. Como criar sua')) return 'comunicacao';
  if (playlist.startsWith('9. Como interagir')) return 'comunicacao';
  if (playlist.startsWith('10. Como ajudar')) return 'melhorar-plataforma';
  if (playlist.startsWith('11. Termos de contrato')) return 'termos-gerais';
  return LEGACY_CONSULTOR_ONBOARDING_STEPS.find((item) => item.playlist === playlist)?.id;
}

export function isIntroCourse(course: string): boolean {
  return INTRO_COURSES.includes(course as typeof INTRO_COURSES[number]);
}

/** Aluno e coordenador usam uma única playlist fixa. A área do consultor pode
 * ter quantas playlists o consultor quiser criar e reorganizar. */
export function isFixedIntroCourse(course: string): boolean {
  return course === INTRO_COURSE_ALUNO || course === INTRO_COURSE_COORDENADOR;
}

export async function saveKnowledge(entry: Omit<KnowledgeEntry, 'timestamp' | 'id'>, providedOrder?: number) {
  try {
    let order = providedOrder;
    if (order === undefined) {
      // A ORDEM É PROCURADA DENTRO DO PRÓPRIO CONSULTOR.
      //
      // Esta consulta não filtrava por consultorId, e as regras do Firestore só
      // deixam o consultor LER o conteúdo dele: a consulta era negada, o erro subia
      // e o vídeo não salvava — só para consultor, porque o admin passa por cima das
      // regras. Era o que acontecia ao cadastrar vídeo num consultor novo.
      const scopedConsultorId = entry.consultorId || resolveConsultorId();
      const q = query(
        collection(db, KNOWLEDGE_COLLECTION),
        where('consultorId', '==', scopedConsultorId),
        where('course', '==', entry.course),
        where('playlist', '==', entry.playlist)
      );
      let lastOrder = 0;
      try {
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
          const docOrder = doc.data().order || 0;
          if (docOrder > lastOrder) lastOrder = docOrder;
        });
      } catch (erroDaOrdem) {
        // Não saber a ordem não pode impedir o vídeo de ser salvo: ele entra no fim
        // e a ordem se arruma arrastando na tela.
        console.warn('[saveKnowledge] não consegui ler a ordem atual da playlist:', erroDaOrdem);
        lastOrder = Date.now() % 100000;
      }
      order = lastOrder + 1;
    }

    const docRef = await addDoc(collection(db, KNOWLEDGE_COLLECTION), {
      ...entry,
      timestamp: new Date(),
      order: order
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving knowledge:", error);
    throw error;
  }
}

export async function getRecentKnowledge(limitCount = 100): Promise<KnowledgeEntry[]> {
  try {
    const q = query(
      collection(db, KNOWLEDGE_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate()
      } as KnowledgeEntry;
    });

    // Sort in memory: playlistOrder first, then order, then timestamp
    return items.sort((a, b) => {
      // Playlist order first
      if (a.playlistOrder !== undefined && b.playlistOrder !== undefined) {
        if (a.playlistOrder !== b.playlistOrder) return a.playlistOrder - b.playlistOrder;
      } else if (a.playlistOrder !== undefined) return -1;
      else if (b.playlistOrder !== undefined) return 1;

      // Then item order
      if (a.order !== undefined && b.order !== undefined) {
        if (a.order !== b.order) return a.order - b.order;
      } else if (a.order !== undefined) return -1;
      else if (b.order !== undefined) return 1;

      // Finally timestamp
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  } catch (error) {
    console.error("Error getting knowledge:", error);
    return [];
  }
}

/** Vídeos institucionais (institucional:true) — fixos para qualquer consultor,
 * independente do tenant, ex.: os 4 vídeos de "como usar a plataforma" na aba Data Analysis. */
export async function getInstitutionalKnowledge(): Promise<KnowledgeEntry[]> {
  try {
    const q = query(collection(db, KNOWLEDGE_COLLECTION), where('institucional', '==', true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, ...data, timestamp: data.timestamp.toDate() } as KnowledgeEntry;
    });
  } catch (error) {
    console.error("Error getting institutional knowledge:", error);
    return [];
  }
}

export async function getAllKnowledge(consultorId?: string): Promise<KnowledgeEntry[]> {
  try {
    const scopedConsultorId = consultorId || resolveConsultorId();
    // Com consultorId: filtra pelo tenant (sem orderBy pra não exigir índice
    // composto; a ordenação é feita em memória logo abaixo). Sem: ordena no servidor.
    const q = query(collection(db, KNOWLEDGE_COLLECTION), where('consultorId', '==', scopedConsultorId));
    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate()
      } as KnowledgeEntry;
    });

    // Sort in memory: playlistOrder first, then order, then timestamp
    return items.sort((a, b) => {
      // Playlist order first
      if (a.playlistOrder !== undefined && b.playlistOrder !== undefined) {
        if (a.playlistOrder !== b.playlistOrder) return a.playlistOrder - b.playlistOrder;
      } else if (a.playlistOrder !== undefined) return -1;
      else if (b.playlistOrder !== undefined) return 1;

      // Then item order
      if (a.order !== undefined && b.order !== undefined) {
        if (a.order !== b.order) return a.order - b.order;
      } else if (a.order !== undefined) return -1;
      else if (b.order !== undefined) return 1;

      // Finally timestamp
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  } catch (error) {
    console.error("Error getting all knowledge:", error);
    return [];
  }
}

export async function deleteKnowledge(id: string) {
  await deleteDoc(doc(db, KNOWLEDGE_COLLECTION, id));
}

export async function updateKnowledge(id: string, data: Partial<KnowledgeEntry>) {
  await updateDoc(doc(db, KNOWLEDGE_COLLECTION, id), data);
}

export async function deleteCourse(courseName: string, consultorId?: string) {
  const scopedConsultorId = consultorId || resolveConsultorId();
  const q = query(collection(db, KNOWLEDGE_COLLECTION), where('course', '==', courseName), where('consultorId', '==', scopedConsultorId));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

export async function updateCourseName(oldName: string, newName: string, consultorId?: string) {
  const scopedConsultorId = consultorId || resolveConsultorId();
  const q = query(collection(db, KNOWLEDGE_COLLECTION), where('course', '==', oldName), where('consultorId', '==', scopedConsultorId));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => batch.update(d.ref, { course: newName }));
  await batch.commit();
}

/**
 * Conta quantos vídeos têm um curso específico (por nome), dentro do tenant.
 * Usado pra mostrar confirmação antes de propagar renomeação de trilha no /config.
 * Operação de leitura — não modifica nada no Firestore.
 */
export async function countVideosByCourse(courseName: string, consultorId?: string): Promise<number> {
  const scopedConsultorId = consultorId || resolveConsultorId();
  const q = query(collection(db, KNOWLEDGE_COLLECTION), where('course', '==', courseName), where('consultorId', '==', scopedConsultorId));
  const snapshot = await getDocs(q);
  return snapshot.size;
}

export async function deletePlaylist(courseName: string, playlistName: string, consultorId?: string) {
  const scopedConsultorId = consultorId || resolveConsultorId();
  const q = query(collection(db, KNOWLEDGE_COLLECTION), where('course', '==', courseName), where('playlist', '==', playlistName), where('consultorId', '==', scopedConsultorId));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

export async function updatePlaylistName(courseName: string, oldName: string, newName: string, consultorId?: string) {
  const scopedConsultorId = consultorId || resolveConsultorId();
  const q = query(collection(db, KNOWLEDGE_COLLECTION), where('course', '==', courseName), where('playlist', '==', oldName), where('consultorId', '==', scopedConsultorId));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => batch.update(d.ref, { playlist: newName }));
  await batch.commit();
}

export async function movePlaylistToCourse(currentCourse: string, playlistName: string, newCourse: string, consultorId?: string): Promise<number> {
  if (currentCourse === newCourse) return 0;
  const scopedConsultorId = consultorId || resolveConsultorId();
  const q = query(
    collection(db, KNOWLEDGE_COLLECTION),
    where('course', '==', currentCourse),
    where('playlist', '==', playlistName),
    where('consultorId', '==', scopedConsultorId)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return 0;
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => batch.update(d.ref, { course: newCourse }));
  await batch.commit();
  return snapshot.docs.length;
}

