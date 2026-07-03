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
import { getInitiatives } from '../services/configService';
import { getAllKnowledge, type KnowledgeEntry } from '../services/knowledgeService';
import { getUserData } from '../services/userService';
import type { Initiative } from '../types';
import {
  getUserProgress, calculateTrilhaProgress, checkAndIssueCertificate,
  type UserProgress, type CertificadoEmitido,
} from '../services/videoProgressService';
import { getAllQuizzes, type QuizConfig } from '../services/quizService';
import QuizRunner from './QuizRunner';
import Certificate from './Certificate';
import OpiniaoModal from './OpiniaoModal';

const LBW = { navy: '#1E2D6E', blue: '#0033CC' };

function trilhaNumFromName(name: string): number {
  const m = name.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

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
  const { loading: accessLoading, plano, isAdmin } = useUserAccess();
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

  useEffect(() => {
    (async () => {
      try {
        const [qs, inits, vids, prog, udata] = await Promise.all([
          getAllQuizzes(),
          getInitiatives(),
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
    const paidOrAdmin = isAdmin || plano === 'completo';
    return quizzes.map((quiz) => {
      // Casa a trilha (nº) com a initiative do Firestore de mesmo número, pra pegar os vídeos.
      const initiative = initiatives.find((i) => trilhaNumFromName(i.name) === quiz.trilha);
      const tp = initiative && progress
        ? calculateTrilhaProgress(initiative, videos, progress.watchedUrls)
        : { total: 0, watched: 0, pct: 0 } as any;
      const unlocked = paidOrAdmin || quiz.trilha === 1;
      const quizAvailable = unlocked && tp.total > 0 && tp.pct >= quiz.watchGatePct;
      const cert = progress?.certificadosEmitidos?.[initiative?.id || ''];
      return {
        quiz, initiative,
        videosTotal: tp.total, videosWatched: tp.watched, watchPct: tp.pct,
        unlocked, quizAvailable: quizAvailable || (unlocked && isAdmin), cert,
      };
    });
  }, [quizzes, initiatives, videos, progress, plano, isAdmin]);

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
    const quiz = quizzes.find((q) => q.trilha === activeQuizTrilha);
    if (quiz) {
      return (
        <QuizRunner
          quiz={quiz}
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
        Complete os vídeos de cada trilha, faça a avaliação e conquiste seu certificado.
        {plano !== 'completo' && !isAdmin && (
          <span className="block mt-1 text-amber-600 font-semibold">
            No plano gratuito, apenas a Trilha 1 está disponível.
          </span>
        )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {blocos.map((b, i) => (
          <BlocoCard
            key={b.quiz.trilha}
            bloco={b}
            index={i}
            certAluno={alunoNome}
            onStart={() => setOpiniaoTrilha(b.quiz.trilha)}
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
            trilhaTitulo={quiz.titulo}
            /* Trilha 1 do aluno gratuito: depoimento obrigatório, sem opção de pular. */
            obrigatorioSemSaida={opiniaoTrilha === 1 && plano !== 'completo' && !isAdmin}
            onCancel={() => setOpiniaoTrilha(null)}
            onDone={() => { const t = opiniaoTrilha; setOpiniaoTrilha(null); setActiveQuizTrilha(t); }}
          />
        );
      })()}
    </div>
  );
}

// ===================================================================================
// Card de cada trilha
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
      {/* Badge trilha */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(0,51,204,.1)', color: LBW.blue }}>
          Trilha {quiz.trilha}
        </span>
        {!unlocked && <Lock size={18} className="text-gray-400" />}
        {aprovado && <CheckCircle2 size={20} className="text-emerald-500" />}
      </div>

      <h3 className="font-bold text-gray-900 leading-snug mb-1">{quiz.titulo}</h3>
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
            <Lock size={16} /> Disponível no plano completo
          </button>
        ) : aprovado ? (
          <CertificadoBlock cert={cert!} alunoNome={certAluno} showCongrats={showCongrats} />
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
function CertificadoBlock({ cert, alunoNome, showCongrats }: {
  cert: CertificadoEmitido; alunoNome: string; showCongrats: boolean;
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
            issuedAt={cert.issuedAt}
            certId={cert.certId}
            mode="student"
          />
        </div>
      )}
    </div>
  );
}
