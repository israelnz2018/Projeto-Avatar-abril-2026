/**
 * AvaliacaoView — aba "Teste de Avaliação e Certificado" (aluno).
 *
 * Jornada completa:
 *   1. Mostra um bloco para cada curso cadastrado pelo consultor.
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
import { LockedToolPopup } from './LockedToolPopup';

const LBW = { navy: '#1E2D6E', blue: '#0033CC' };

const CURSO_ISRAEL_POR_TESTE: Record<number, string> = {
  1: 'Como Resolver Problemas no Trabalho - Kit 90 dias',
  2: 'Como Recomendar Melhorias com Base em Análise de Dados',
  3: 'Como Conduzir Mudanças com Menos Resistência',
  4: 'Como Criar Apresentações que Convencem',
  5: 'Como Antecipar Riscos Antes que Virem Problemas',
  6: 'Como Aplicar a Cultura Lean',
  7: 'Como Fazer Análises Estatísticas Aplicadas a Negócios',
  8: 'Formação Profissional em Gestão de Projetos de Melhoria',
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
  // Trilha aprovada cujo depoimento obrigatório está sendo pedido antes do certificado.
  const [opiniaoTrilha, setOpiniaoTrilha] = useState<number | null>(null);
  const [cursoBloqueado, setCursoBloqueado] = useState<string | null>(null);
  const [certificadoErro, setCertificadoErro] = useState('');

  const uid = auth.currentUser?.uid;
  const consultorId = resolveConsultorId();

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
    return initiatives.map((initiative, index) => {
      // A lista nasce dos CURSOS, não das provas. Por isso um curso sem teste
      // configurado continua visível e jamais some da área de certificação.
      // O initiativeId é prioritário; os números existem apenas para compatibilidade.
      const legacyTrilha = consultorId === 'israel'
        ? Number(Object.entries(CURSO_ISRAEL_POR_TESTE)
          .find(([, courseName]) => courseName === initiative.name)?.[0] || 0)
        : 0;
      const preferredTrilha = legacyTrilha || initiative.ordem || index + 1;
      const savedQuiz = quizzes.find((item) => item.initiativeId === initiative.id)
        || quizzes.find((item) => item.trilha === preferredTrilha);
      const quiz: QuizConfig = {
        trilha: savedQuiz?.trilha || preferredTrilha,
        initiativeId: initiative.id,
        titulo: initiative.name,
        passPct: savedQuiz?.passPct ?? 0.70,
        watchGatePct: savedQuiz?.watchGatePct ?? 0.70,
        questions: savedQuiz?.questions || [],
        consultorId,
        updatedAt: savedQuiz?.updatedAt,
      };
      const unlocked = staff || (acessoRestritoPorCurso && hasCourseAccess(cursosLiberados, initiative.name));
      const tp = initiative && progress
        ? calculateTrilhaProgress(initiative, videos, progress.watchedUrls)
        : { total: 0, watched: 0, pct: 0 } as any;
      const hasConfiguredQuiz = quiz.questions.length > 0;
      const quizAvailable = hasConfiguredQuiz && unlocked && tp.total > 0 && tp.pct >= quiz.watchGatePct;
      const cert = progress?.certificadosEmitidos?.[initiative?.id || ''];
      return {
        quiz, initiative,
        videosTotal: tp.total, videosWatched: tp.watched, watchPct: tp.pct,
        unlocked, quizAvailable: quizAvailable || (hasConfiguredQuiz && unlocked && isAdmin), cert,
      };
    });
  }, [quizzes, initiatives, videos, progress, plano, isAdmin, isConsultor, isCoordenador, cursosLiberados, acessoPorCurso]);

  const depoimentoPosProvaAtivo = consultor.depoimentoPosProvaAtivo
    ?? consultor.depoimentoPreProvaAtivo !== false;

  // A emissão acontece depois da prova e, quando ativado, depois do depoimento.
  const emitirCertificado = async (trilha: number) => {
    setCertificadoErro('');
    const bloco = blocos.find((b) => b.quiz.trilha === trilha);
    if (bloco?.initiative && uid) {
      try {
        const emitido = await checkAndIssueCertificate(uid, bloco.initiative, videos, alunoNome);
        const fresh = await getUserProgress(uid);
        setProgress(fresh);
        if (!emitido && !fresh?.certificadosEmitidos?.[bloco.initiative.id]) {
          setCertificadoErro('O certificado ainda não foi emitido. Confirme os 70% dos vídeos, a aprovação na prova e o depoimento enviado.');
          return;
        }
      } catch (e) {
        console.error('[AvaliacaoView] emitir cert:', e);
        setCertificadoErro('Não foi possível emitir o certificado agora. Tente novamente em instantes.');
        return;
      }
    }
    setActiveQuizTrilha(null);
    setJustPassedTrilha(trilha);
  };

  const handlePassed = async (trilha: number) => {
    setActiveQuizTrilha(null);
    if (depoimentoPosProvaAtivo) {
      setOpiniaoTrilha(trilha);
      return;
    }
    await emitirCertificado(trilha);
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

  const avaliacaoPronta = (bloco: BlocoState) => bloco.unlocked && (bloco.quizAvailable || !!bloco.cert);
  const grupos = [
    {
      key: 'disponiveis',
      titulo: '1. Avaliações disponíveis para você',
      descricao: 'Avaliações dos cursos que você já adquiriu. Faça agora as que estão liberadas e acompanhe, nas demais, o progresso necessário para desbloqueá-las.',
      itens: blocos
        .filter((bloco) => bloco.unlocked)
        .sort((a, b) => Number(avaliacaoPronta(b)) - Number(avaliacaoPronta(a))),
      className: 'border-blue-200 bg-blue-50/40',
    },
    {
      key: 'sem-acesso',
      titulo: '2. Avaliações não disponíveis',
      descricao: 'Avaliações de cursos que você ainda não adquiriu. Para acessá-las, solicite a liberação do curso ao seu consultor.',
      itens: blocos.filter((bloco) => !bloco.unlocked),
      className: 'border-gray-200 bg-gray-50',
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <GraduationCap size={28} style={{ color: LBW.blue }} />
        <h1 className="text-2xl font-bold text-gray-900">Teste de Avaliação e Certificado</h1>
      </div>
      <p className="text-gray-500 mb-8">
        Complete os vídeos de cada curso, faça a avaliação e conquiste seu certificado.
      </p>
      {certificadoErro && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">{certificadoErro}</p>}

      {blocos.length === 0 && (
        <div className="rounded-2xl bg-white border border-dashed border-gray-300 p-6 text-center">
          <p className="text-sm font-bold text-gray-700 mb-1">Nenhuma avaliação disponível para os seus cursos.</p>
          {(isAdmin || isConsultor) && <p className="text-xs text-gray-500">Configure os testes em <b>Configuração → Teste de Avaliação</b>.</p>}
        </div>
      )}

      <div className="space-y-8">
        {grupos.filter((grupo) => grupo.itens.length > 0).map((grupo) => (
          <section key={grupo.key} className={`rounded-3xl border p-4 md:p-5 ${grupo.className}`}>
            <div className="mb-4">
              <h2 className="text-lg font-black text-gray-900">{grupo.titulo}</h2>
              <p className="mt-1 text-sm text-gray-500">{grupo.descricao}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {grupo.itens.map((b, i) => (
                <BlocoCard
                  key={b.initiative?.id || b.quiz.trilha}
                  bloco={b}
                  index={i}
                  certAluno={alunoNome}
                  onStart={() => {
                    setActiveQuizTrilha(b.quiz.trilha);
                  }}
                  onLocked={() => setCursoBloqueado(b.initiative?.name || b.quiz.titulo)}
                  showCongrats={justPassedTrilha === b.quiz.trilha}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Pop-up de depoimento obrigatório — abre depois da aprovação */}
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
            initiativeId={blocos.find((b) => b.quiz.trilha === opiniaoTrilha)?.initiative?.id}
            obrigatorioSemSaida
            onCancel={() => setOpiniaoTrilha(null)}
            onDone={() => { const t = opiniaoTrilha; setOpiniaoTrilha(null); void emitirCertificado(t); }}
          />
        );
      })()}
      <LockedToolPopup
        isOpen={cursoBloqueado !== null}
        onClose={() => setCursoBloqueado(null)}
        recursoNome={cursoBloqueado ? `o curso ${cursoBloqueado}` : undefined}
      />
    </div>
  );
}

// ===================================================================================
// Card de cada curso
// ===================================================================================
function BlocoCard({ bloco, index, certAluno, onStart, onLocked, showCongrats }: {
  bloco: BlocoState; index: number; certAluno: string; onStart: () => void; onLocked: () => void; showCongrats: boolean;
}) {
  const { quiz, unlocked, quizAvailable, videosTotal, videosWatched, watchPct, cert } = bloco;
  const pctInt = Math.round(watchPct * 100);
  const metaInt = Math.round(quiz.watchGatePct * 100);
  const aprovado = !!cert;
  const hasConfiguredQuiz = quiz.questions.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className={`relative rounded-2xl border p-5 flex flex-col transition-all ${
        aprovado
          ? 'bg-emerald-50/40 border-emerald-400 shadow-md'
          : unlocked
            ? 'bg-white border-blue-300 shadow-md ring-1 ring-blue-100'
            : 'bg-slate-200/80 border-slate-400 shadow-none'
      }`}
    >
      {/* Identificação do curso */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[11px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full ${
          unlocked ? 'bg-blue-100 text-blue-800' : 'bg-slate-300 text-slate-600'
        }`}>
          Curso
        </span>
        {!unlocked && <Lock size={19} className="text-slate-600" />}
        {aprovado && <CheckCircle2 size={20} className="text-emerald-500" />}
      </div>

      <h3 className={`font-bold leading-snug mb-1 ${unlocked ? 'text-gray-900' : 'text-slate-600'}`}>{bloco.initiative?.name?.replace(/^\d+\s*[-—]?\s*/, '') || quiz.titulo}</h3>
      <p className={`text-xs mb-4 ${unlocked ? 'text-gray-400' : 'text-slate-500'}`}>
        {hasConfiguredQuiz
          ? `${quiz.questions.length} questões · aprovação ${Math.round(quiz.passPct * 100)}%`
          : 'Avaliação ainda não configurada'}
      </p>

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
          <button onClick={onLocked} className="w-full py-2.5 rounded-xl border border-slate-400 bg-slate-300 text-slate-700 font-black text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-400 hover:text-slate-800 transition-colors">
            <Lock size={16} /> Curso não adquirido
          </button>
        ) : aprovado ? (
          <CertificadoBlock cert={cert!} alunoNome={certAluno} initiativeId={bloco.initiative?.id} showCongrats={showCongrats} />
        ) : !hasConfiguredQuiz ? (
          <button disabled className="w-full py-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-bold text-sm cursor-not-allowed">
            Avaliação em preparação
          </button>
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
