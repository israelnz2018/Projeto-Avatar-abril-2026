/**
 * QuizRunner — executa uma prova com UX de mercado (Coursera/Uxcel style):
 *   - Tela de intro com regras.
 *   - Uma pergunta por vez, barra de progresso no topo.
 *   - Navegação livre (anterior/próxima) + grade de questões pra pular.
 *   - Revisão antes de enviar (destaca não respondidas).
 *   - Resultado com nota, acerto por questão e ação (aprovado → parabéns).
 *   - Alternativas embaralhadas por sessão (evita "decorar posição").
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, X, CheckCircle2, XCircle, RotateCcw, Flag } from 'lucide-react';
import { gradeQuiz, shuffleOptions, type QuizConfig } from '../services/quizService';

const LBW = { navy: '#1E2D6E', blue: '#0033CC' };

type Phase = 'intro' | 'running' | 'review' | 'result';

export default function QuizRunner({ quiz, onExit, onPassed }: {
  quiz: QuizConfig; onExit: () => void; onPassed: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const seed = useMemo(() => quiz.questions.length * 7 + quiz.trilha, [quiz]);

  // Alternativas embaralhadas (estável durante a sessão).
  const shuffled = useMemo(
    () => quiz.questions.map((q) => ({ q, ...shuffleOptions(q, seed) })),
    [quiz, seed]
  );

  const total = quiz.questions.length;
  const answeredCount = Object.keys(answers).length;

  const result = useMemo(() => {
    // Converte respostas (índice embaralhado) de volta pro índice original antes de corrigir.
    const originalAnswers: Record<string, number> = {};
    for (const item of shuffled) {
      const chosenShuffled = answers[item.q.id];
      if (chosenShuffled === undefined) continue;
      // mapeia posição embaralhada -> texto -> índice original
      const chosenText = item.options[chosenShuffled];
      originalAnswers[item.q.id] = item.q.options.indexOf(chosenText);
    }
    return gradeQuiz(quiz, originalAnswers);
  }, [answers, quiz, shuffled]);

  const choose = (qid: string, optIdx: number) => setAnswers((a) => ({ ...a, [qid]: optIdx }));

  // ---------- INTRO ----------
  if (phase === 'intro') {
    return (
      <Shell onExit={onExit} title={quiz.titulo}>
        <div className="max-w-lg mx-auto text-center py-10">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'rgba(0,51,204,.1)' }}>
            <Flag size={30} style={{ color: LBW.blue }} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Avaliação da Trilha {quiz.trilha}</h2>
          <p className="text-gray-500 mb-6">{quiz.titulo}</p>
          <div className="text-left bg-gray-50 rounded-xl p-5 mb-6 space-y-2 text-sm text-gray-600">
            <p>✓ <b>{total} questões</b> de múltipla escolha</p>
            <p>✓ Você precisa acertar <b>{Math.round(quiz.passPct * 100)}%</b> para ser aprovado</p>
            <p>✓ Pode navegar entre as questões e revisar antes de enviar</p>
            <p>✓ Ao ser aprovado, seu <b>certificado</b> é gerado automaticamente</p>
          </div>
          <button onClick={() => setPhase('running')}
            className="w-full py-3 rounded-xl text-white font-bold transition-transform hover:scale-[1.02]"
            style={{ background: LBW.blue }}>
            Começar avaliação →
          </button>
        </div>
      </Shell>
    );
  }

  // ---------- RESULT ----------
  if (phase === 'result') {
    const pctInt = Math.round(result.pct * 100);
    return (
      <Shell onExit={onExit} title={quiz.titulo}>
        <div className="max-w-lg mx-auto text-center py-8">
          {result.passed ? (
            <>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-emerald-100">
                <CheckCircle2 size={44} className="text-emerald-600" />
              </motion.div>
              <h2 className="text-3xl font-black text-emerald-600 mb-1">Aprovado! 🎉</h2>
              <p className="text-gray-600 mb-6">Você acertou <b>{result.correct}/{result.total}</b> ({pctInt}%).</p>
              <button onClick={onPassed}
                className="w-full py-3 rounded-xl text-white font-bold" style={{ background: '#10B981' }}>
                Ver meu certificado →
              </button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-red-100">
                <XCircle size={44} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Quase lá!</h2>
              <p className="text-gray-600 mb-2">Você acertou <b>{result.correct}/{result.total}</b> ({pctInt}%).</p>
              <p className="text-gray-500 text-sm mb-6">São necessários {Math.round(quiz.passPct * 100)}% para aprovar. Revise o conteúdo e tente novamente.</p>
              <div className="flex gap-3">
                <button onClick={() => { setAnswers({}); setCurrent(0); setPhase('running'); }}
                  className="flex-1 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2" style={{ background: LBW.blue }}>
                  <RotateCcw size={18} /> Tentar de novo
                </button>
                <button onClick={onExit} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold">
                  Sair
                </button>
              </div>
            </>
          )}
          {/* Revisão de acertos/erros */}
          <div className="mt-8 text-left space-y-2">
            {shuffled.map((item, i) => {
              const chosenText = answers[item.q.id] !== undefined ? item.options[answers[item.q.id]] : null;
              const correctText = item.q.options[item.q.correctIndex];
              const ok = chosenText === correctText;
              return (
                <div key={item.q.id} className={`p-3 rounded-lg text-sm border ${ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="font-semibold text-gray-800">{i + 1}. {item.q.text}</p>
                  <p className={ok ? 'text-emerald-700' : 'text-red-600'}>
                    {ok ? '✓' : '✗'} Sua resposta: {chosenText ?? '(em branco)'}
                  </p>
                  {!ok && <p className="text-emerald-700">✓ Correta: {correctText}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- REVIEW ----------
  if (phase === 'review') {
    const unanswered = shuffled.filter((it) => answers[it.q.id] === undefined);
    return (
      <Shell onExit={onExit} title={quiz.titulo}>
        <div className="max-w-2xl mx-auto py-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Revisar antes de enviar</h2>
          <p className="text-gray-500 mb-5">{answeredCount}/{total} respondidas.</p>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 mb-6">
            {shuffled.map((it, i) => {
              const done = answers[it.q.id] !== undefined;
              return (
                <button key={it.q.id} onClick={() => { setCurrent(i); setPhase('running'); }}
                  className={`aspect-square rounded-lg text-sm font-bold flex items-center justify-center ${done ? 'text-white' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}
                  style={done ? { background: LBW.blue } : {}}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          {unanswered.length > 0 && (
            <p className="text-amber-600 text-sm mb-4 font-semibold">
              ⚠ {unanswered.length} questão(ões) sem resposta serão contadas como erradas.
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setPhase('running')} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold">
              Voltar
            </button>
            <button onClick={() => setPhase('result')} className="flex-1 py-3 rounded-xl text-white font-bold" style={{ background: '#10B981' }}>
              Enviar avaliação
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- RUNNING ----------
  const item = shuffled[current];
  const chosen = answers[item.q.id];
  const progressPct = Math.round(((current + 1) / total) * 100);

  return (
    <Shell onExit={onExit} title={quiz.titulo}>
      {/* Barra de progresso */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>Questão {current + 1} de {total}</span>
          <span>{answeredCount} respondidas</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-8">
          <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: LBW.blue }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={item.q.id}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-6 leading-snug">{item.q.text}</h2>
            <div className="space-y-3">
              {item.options.map((opt, idx) => {
                const selected = chosen === idx;
                return (
                  <button key={idx} onClick={() => choose(item.q.id, idx)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${selected ? 'border-transparent text-white' : 'border-gray-200 bg-white hover:border-blue-300 text-gray-700'}`}
                    style={selected ? { background: LBW.blue } : {}}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${selected ? 'bg-white/25' : 'bg-gray-100 text-gray-500'}`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-sm md:text-base">{opt}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navegação */}
        <div className="flex items-center justify-between mt-8">
          <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}
            className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm flex items-center gap-2 disabled:opacity-40">
            <ArrowLeft size={16} /> Anterior
          </button>
          {current < total - 1 ? (
            <button onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
              className="px-5 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2" style={{ background: LBW.blue }}>
              Próxima <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={() => setPhase('review')}
              className="px-5 py-2.5 rounded-xl text-white font-bold text-sm flex items-center gap-2" style={{ background: '#10B981' }}>
              Revisar e enviar <Flag size={16} />
            </button>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children, onExit, title }: { children: React.ReactNode; onExit: () => void; title: string }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-10">
        <span className="font-bold text-gray-700 truncate">{title}</span>
        <button onClick={onExit} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <X size={20} />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
