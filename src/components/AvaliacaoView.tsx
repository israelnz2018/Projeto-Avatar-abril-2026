/**
 * AvaliacaoView — aba "Teste de Avaliação e Certificado" (aluno).
 *
 * Jornada completa:
 *   1. Mostra 8 blocos (um por trilha).
 *   2. Cadeado por acesso: aluno completo/admin → todas liberadas; gratuito → só trilha 1.
 *   3. Cada bloco mostra: nº de vídeos, % assistido e a meta (watchGatePct) para liberar a prova.
 *   4. Botão da prova funciona quando: (a) tem acesso à trilha E (b) atingiu a meta de vídeos.
 *   5. Ao clicar, abre o quiz (QuizRunner) — uma pergunta por vez, barra de progresso.
 *   6. Se acertar >= passPct (70%): parabéns + certificado (nome do sistema) + download.
 *
 * Reusa: useUserAccess (pago/grátis), videoProgressService (%), quizService (provas),
 * Certificate (certificado já existente com download/print).
 */

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Lock, PlayCircle, Award, CheckCircle2, GraduationCap } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useUserAccess } from '../hooks/useUserAccess';
import { getEducationCourses } from '../services/educationCourseService';
import { getAllKnowledge, type KnowledgeEntry } from '../services/knowledgeService';
import { getUserData } from '../services/userService';
import type { Initiative } from '../types';
import {
  getUserProgress, calculateTrilhaProgress, checkAndIssueCertificate,
  type UserProgress, type CertificadoEmitido,
} from '../services/videoProgressService';
import { getAllQuizzes, type QuizConfig } from '../services/quizService';
import { resolveConsultorId } from '../services/consultorService';
import { useConsultor } from '../contexts/ConsultorContext';
import QuizRunner from './QuizRunner';
import Certificate from './Certificate';
import OpiniaoModal from './OpiniaoModal';
import { hasCourseAccess } from '../lib/courseAccess';

const LBW = { navy: '#1E2D6E', blue: '#0033CC' };

const CURSO_ISRAEL_POR_TESTE: Record<number, string> = {
  1: 'Como Resolver Problemas no Trabalho - Kit 90 dias',
  2: 'Como Recomendar Melhorias com Base em Análise de Dados',
  3: 'Como Conduzir Mudanças com Menos Resistência',
  4: 'Como Criar Apresentações que Convencem',
  5: 'Como Antecipar Riscos Antes que Virem Problemas',
  6: 'Como Aplicar a Cultura Lean',
  7: 'Como Fazer Análises Estatísticas Aplicadas a Negócios',
  8: 'Como Se Tornar um Especialista em Gestão de Projetos de Melhoria',
};

interface BlocoState {
  quiz: QuizConfig;
  initiative?: Initiative;
  videosTotal: number;
  videosWatched: number;
  watchPct: number;
  unlocked: boolean;        // tem acesso (pago/grátis)
  quizAvailable: boolean;   // atingiu a meta de vídeos
  cert?: CertificadoEmitido;
}

export default function AvaliacaoView() {
  const { consultor } = useConsultor();
  const {
    loading: accessLoading,
    plano,
    isAdmin,
    isConsultor,
    isCoordenador,
    cursosLiberados,
    acessoPorCurso,
  } = useUserAccess();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<QuizConfig[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [videos, setVideos] = useState<KnowledgeEntry[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [alunoNome, setAlunoNome] = useState('Aluno LBW');
  const [activeQuizTrilha, setActiveQuizTrilha] = useState<number | null>(null);
  const [justPassedTrilha, setJustPassedTrilha] = useState<number | null>(null);
  // Trilha cujo depoimento (obrigatório) está sendo pedido, antes de abrir a prova.
  const [opiniaoTrilha, setOpiniaoTrilha] = useState<number | null>(null);

  const uid = auth.currentUser?.uid;
  const consultorId = resolveConsultorId();

  const cursoDoTeste = (quiz: QuizConfig) => initiatives.find((initiative) => initiative.id === quiz.initiativeId)
    || (consultorId === 'israel'
      ? initiatives.find((initiative) => initiative.name === CURSO_ISRAEL_POR_TESTE[quiz.trilha])
      : initiatives.find((initiative) => initiative.ordem === quiz.trilha));

  useEffect(() => {
    (async () => {
      try {
        const [qs, inits, vids, prog, udata] = await Promise.all([
          getAllQuizzes(consultorId),
          getEducationCourses(consultorId),
          getAllKnowledge(),
          uid ? getUserProgress(uid) : Promise.resolve(null),
          uid ? getUserData(uid) : Promise.resolve(null),
        ]);
        setQuizzes(qs);
        setInitiatives(inits);
        setVideos(vids);
        setProgress(prog);
        setAlunoNome(
          (udata as any)?.nome || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Aluno LBW'
        );
      } catch (e) {
        console.error('[AvaliacaoView] erro ao carregar:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const blocos: BlocoState[] = useMemo(() => {
    const staff = isAdmin || isConsultor;
    const acessoRestritoPorCurso = acessoPorCurso || isCoordenador;
    return quizzes.flatMap((quiz) => {
      // O ID salvo é prioritário. Para testes legados, a ordem do curso mantém a
      // compatibilidade sem tentar extrair números do título comercial.
      const initiative = cursoDoTeste(quiz);
      if (!initiative) return [];
      const unlocked = staff
        || (acessoRestritoPorCurso
          ? hasCourseAccess(cursosLiberados, initiative.name)
          : plano === 'completo');
      const tp = initiative && progress
        ? calculateTrilhaProgress(initiative, videos, progress.watchedUrls)
        : { total: 0, watched: 0, pct: 0 } as any;
      const quizAvailable = unlocked && tp.total > 0 && tp.pct >= quiz.watchGatePct;
      const cert = progress?.certificadosEmitidos?.[initiative?.id || ''];
      return {
        quiz, initiative,
        videosTotal: tp.total, videosWatched: tp.watched, watchPct: tp.pct,
        unlocked, quizAvailable: quizAvailable || (unlocked && isAdmin), cert,
      };
    });
  }, [quizzes, initiatives, videos, progress, plano, isAdmin, isConsultor, isCoordenador, cursosLiberados, acessoPorCurso]);

  // Ao terminar a prova aprovado: emite certificado e mostra parabéns.
  const handlePassed = async (trilha: number) => {
    const bloco = blocos.find((b) => b.quiz.trilha === trilha);
    if (bloco?.initiative && uid) {
      // Emite mesmo que o gate de vídeo não bata (a prova é a validação final aqui).
      try {
        await checkAndIssueCertificate(uid, bloco.initiative, videos, alunoNome).catch(() => {});
        const fresh = await getUserProgress(uid);
        setProgress(fresh);
      } catch (e) { console.error('[AvaliacaoView] emitir cert:', e); }
    }
    setActiveQuizTrilha(null);
    setJustPassedTrilha(trilha);
  };

  if (accessLoading || loading) {
    return <div className="p-8 text-center text-gray-500">Carregando avaliações…</div>;
  }

  // Modo prova em tela cheia
  if (activeQuizTrilha !== null) {
    const bloco = blocos.find((item) => item.quiz.trilha === activeQuizTrilha);
    const quiz = bloco?.quiz;
    if (quiz && bloco?.initiative) {
      const curso = bloco.initiative;
      return (
        <QuizRunner
          quiz={{ ...quiz, titulo: curso?.name?.replace(/^\d+\s*[-—]?\s*/, '') || quiz.titulo }}
          onExit={() => setActiveQuizTrilha(null)}
          onPassed={() => handlePassed(activeQuizTrilha)}
        />
      );
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <GraduationCap size={28} style={{ color: LBW.blue }} />
        <h1 className="text-2xl font-bold text-gray-900">Teste de Avaliação e Certificado</h1>
      </div>
      <p className="text-gray-500 mb-8">
        Complete os vídeos de cada curso, faça a avaliação e conquiste seu certificado.
      </p>

      {blocos.length === 0 && (
        <div className="rounded-2xl bg-white border border-dashed border-gray-300 p-6 text-center">
          <p className="text-sm font-bold text-gray-700 mb-1">Nenhuma avaliação disponível para os seus cursos.</p>
          {(isAdmin || isConsultor) && <p className="text-xs text-gray-500">Configure os testes em <b>Configuração → Teste de Avaliação</b>.</p>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {blocos.map((b, i) => (
          <BlocoCard
            key={b.quiz.trilha}
            bloco={b}
            index={i}
            certAluno={alunoNome}
            onStart={() => {
              if (consultor.depoimentoPreProvaAtivo === false) setActiveQuizTrilha(b.quiz.trilha);
              else setOpiniaoTrilha(b.quiz.trilha);
            }}
            showCongrats={justPassedTrilha === b.quiz.trilha}
          />
        ))}
      </div>

      {/* Pop-up de depoimento obrigatório — abre antes da prova */}
      {opiniaoTrilha !== null && uid && (() => {
        const quiz = quizzes.find((q) => q.trilha === opiniaoTrilha);
        if (!quiz) return null;
        return (
          <OpiniaoModal
            uid={uid}
            alunoNome={alunoNome}
            alunoEmail={auth.currentUser?.email || ''}
            trilha={opiniaoTrilha}
            trilhaTitulo={blocos.find((b) => b.quiz.trilha === opiniaoTrilha)?.initiative?.name || quiz.titulo}
            obrigatorioSemSaida={false}
            onCancel={() => setOpiniaoTrilha(null)}
            onDone={() => { const t = opiniaoTrilha; setOpiniaoTrilha(null); setActiveQuizTrilha(t); }}
          />
        );
      })()}
    </div>
  );
}

// ===================================================================================
// Card de cada curso
// ===================================================================================
function BlocoCard({ bloco, index, certAluno, onStart, showCongrats }: {
  bloco: BlocoState; index: number; certAluno: string; onStart: () => void; showCongrats: boolean;
}) {
  const { quiz, unlocked, quizAvailable, videosTotal, videosWatched, watchPct, cert } = bloco;
  const pctInt = Math.round(watchPct * 100);
  const metaInt = Math.round(quiz.watchGatePct * 100);
  const aprovado = !!cert;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="relative rounded-2xl border bg-white p-5 flex flex-col shadow-sm"
      style={{ borderColor: aprovado ? '#10B981' : unlocked ? 'rgba(0,51,204,.25)' : '#E5E7EB' }}
    >
      {/* Identificação do curso */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(0,51,204,.1)', color: LBW.blue }}>
          Curso
        </span>
        {!unlocked && <Lock size={18} className="text-gray-400" />}
        {aprovado && <CheckCircle2 size={20} className="text-emerald-500" />}
      </div>

      <h3 className="font-bold text-gray-900 leading-snug mb-1">{bloco.initiative?.name?.replace(/^\d+\s*[-—]?\s*/, '') || quiz.titulo}</h3>
      <p className="text-xs text-gray-400 mb-4">{quiz.questions.length} questões · aprovação {Math.round(quiz.passPct * 100)}%</p>

      {/* Progresso de vídeos */}
      {unlocked && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{videosWatched}/{videosTotal} vídeos assistidos</span>
            <span className="font-bold" style={{ color: pctInt >= metaInt ? '#10B981' : '#6B7280' }}>{pctInt}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${pctInt}%`, background: pctInt >= metaInt ? '#10B981' : LBW.blue }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Meta para liberar a prova: {metaInt}% dos vídeos</p>
        </div>
      )}

      {/* Ação */}
      <div className="mt-auto pt-2">
        {!unlocked ? (
          <button disabled className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-400 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
            <Lock size={16} /> Curso não liberado para você
          </button>
        ) : aprovado ? (
          <CertificadoBlock cert={cert!} alunoNome={certAluno} initiativeId={bloco.initiative?.id} showCongrats={showCongrats} />
        ) : quizAvailable ? (
          <button onClick={onStart}
            className="w-full py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
            style={{ background: LBW.blue }}>
            <PlayCircle size={18} /> Fazer avaliação
          </button>
        ) : (
          <button disabled className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-400 font-bold text-sm cursor-not-allowed">
            Assista {metaInt}% dos vídeos para liberar
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ===================================================================================
// Bloco do certificado conquistado (parabéns + prévia + botões)
// ===================================================================================
function CertificadoBlock({ cert, alunoNome, initiativeId, showCongrats }: {
  cert: CertificadoEmitido; alunoNome: string; initiativeId?: string; showCongrats: boolean;
}) {
  const [open, setOpen] = useState(showCongrats);
  return (
    <div>
      {showCongrats && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
          <p className="text-emerald-700 font-black text-lg">🎉 Parabéns!</p>
          <p className="text-emerald-600 text-xs">Você foi aprovado e conquistou o certificado.</p>
        </motion.div>
      )}
      <button onClick={() => setOpen((v) => !v)}
        className="w-full py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
        style={{ background: '#10B981' }}>
        <Award size={18} /> {open ? 'Ocultar certificado' : 'Ver / baixar certificado'}
      </button>
      {open && (
        <div className="mt-3 -mx-5">
          <Certificate
            alunoNome={cert.alunoNomeAtIssue || alunoNome}
            initiativeName={cert.initiativeNameAtIssue}
            initiativeId={initiativeId}
            issuedAt={cert.issuedAt}
            certId={cert.certId}
            mode="student"
          />
        </div>
      )}
    </div>
  );
}
