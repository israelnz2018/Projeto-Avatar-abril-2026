/**
 * AvaliacaoAdminView — configuração dos testes de avaliação do consultor.
 *
 * A navegação é por curso, em sanfonas. O nome exibido é sempre o nome real
 * cadastrado em Meus Cursos; o número só é usado internamente para manter
 * compatibilidade com os quizzes existentes.
 */

import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Check, ChevronDown, ClipboardCheck, Target, Video } from 'lucide-react';
import { getQuiz, saveQuiz, type QuizConfig, type QuizQuestion } from '../services/quizService';
import { getOpiniaoItens, saveOpiniaoItens } from '../services/opiniaoService';
import { resolveConsultorId } from '../services/consultorService';
import { getEducationCourses } from '../services/educationCourseService';
import { useConsultor } from '../contexts/ConsultorContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Initiative } from '../types';

const LBW = { navy: '#1E2D6E', blue: '#0033CC' };

const TESTE_ISRAEL_POR_CURSO: Record<string, number> = {
  'Como Resolver Problemas no Trabalho - Kit 90 dias': 1,
  'Como Recomendar Melhorias com Base em Análise de Dados': 2,
  'Como Conduzir Mudanças com Menos Resistência': 3,
  'Como Criar Apresentações que Convencem': 4,
  'Como Antecipar Riscos Antes que Virem Problemas': 5,
  'Como Aplicar a Cultura Lean': 6,
  'Como Fazer Análises Estatísticas Aplicadas a Negócios': 7,
  'Como Se Tornar um Especialista em Gestão de Projetos de Melhoria': 8,
};

function cursoNumero(nome: string) {
  return Number(String(nome || '').match(/\d+/)?.[0] || 0);
}

function cursoChave(curso: Initiative, index: number, consultorId: string) {
  if (consultorId === 'israel' && TESTE_ISRAEL_POR_CURSO[curso.name]) return TESTE_ISRAEL_POR_CURSO[curso.name];
  if (typeof curso.ordem === 'number' && curso.ordem > 0) return curso.ordem;
  const numeroNoNome = cursoNumero(curso.name);
  return numeroNoNome > 0 ? numeroNoNome : index + 1;
}

function nomeVisualCurso(nome: string) {
  return String(nome || '').trim();
}

export default function AvaliacaoAdminView() {
  const consultorId = resolveConsultorId();
  const { consultor, refresh } = useConsultor();
  const [trilha, setTrilha] = useState(1);
  const [cursos, setCursos] = useState<Initiative[]>([]);
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [opiniaoItens, setOpiniaoItens] = useState<string[]>([]);
  const [opiniaoMsg, setOpiniaoMsg] = useState('');
  const [salvandoDepoimento, setSalvandoDepoimento] = useState(false);

  const cursosOrdenados = [...cursos]
    .sort((a, b) => {
      const ordemA = typeof a.ordem === 'number' ? a.ordem : Number.MAX_SAFE_INTEGER;
      const ordemB = typeof b.ordem === 'number' ? b.ordem : Number.MAX_SAFE_INTEGER;
      if (ordemA === ordemB) return a.name.localeCompare(b.name, 'pt-BR');
      return ordemA - ordemB;
    });

  const cursoSelecionado = cursosOrdenados.find((curso, index) => cursoChave(curso, index, consultorId) === trilha);
  const nomeCursoSelecionado = nomeVisualCurso(cursoSelecionado?.name || config?.titulo || `Curso ${trilha}`);

  useEffect(() => {
    getEducationCourses(consultorId)
      .then((lista) => {
        const ordenados = [...lista].sort((a, b) => {
          const ordemA = typeof a.ordem === 'number' ? a.ordem : Number.MAX_SAFE_INTEGER;
          const ordemB = typeof b.ordem === 'number' ? b.ordem : Number.MAX_SAFE_INTEGER;
          if (ordemA === ordemB) return a.name.localeCompare(b.name, 'pt-BR');
          return ordemA - ordemB;
        });
        setCursos(ordenados);
        if (ordenados[0]) setTrilha(cursoChave(ordenados[0], 0, consultorId));
      })
      .catch(() => setCursos([]));
  }, []);

  useEffect(() => {
    getOpiniaoItens().then(setOpiniaoItens).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getQuiz(trilha, consultorId)
      .then((quiz) => {
        const curso = cursosOrdenados.find((c, index) => cursoChave(c, index, consultorId) === trilha);
        setConfig({ ...quiz, initiativeId: curso?.id, titulo: nomeVisualCurso(curso?.name || quiz.titulo) });
      })
      .catch((e) => console.error('[AdminAvaliacao] getQuiz:', e))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trilha, consultorId, cursos.length]);

  const handleSaveItens = async () => {
    try {
      await saveOpiniaoItens(opiniaoItens);
      setOpiniaoMsg('✓ Itens salvos.');
      setTimeout(() => setOpiniaoMsg(''), 3000);
    } catch {
      setOpiniaoMsg('✗ Erro ao salvar itens.');
    }
  };

  const handleToggleDepoimento = async (ativo: boolean) => {
    setSalvandoDepoimento(true);
    setOpiniaoMsg('');
    try {
      await setDoc(doc(db, 'consultores', consultorId), { depoimentoPreProvaAtivo: ativo }, { merge: true });
      await refresh();
      setOpiniaoMsg(ativo ? '✓ Depoimento ativado.' : '✓ Depoimento desativado.');
    } catch {
      setOpiniaoMsg('✗ Erro ao salvar opção.');
    } finally {
      setSalvandoDepoimento(false);
    }
  };

  const update = (patch: Partial<QuizConfig>) => setConfig((c) => (c ? { ...c, ...patch } : c));

  const updateQuestion = (qid: string, patch: Partial<QuizQuestion>) =>
    setConfig((c) => c ? { ...c, questions: c.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)) } : c);

  const updateOption = (qid: string, idx: number, value: string) =>
    setConfig((c) => c ? {
      ...c,
      questions: c.questions.map((q) =>
        q.id === qid ? { ...q, options: q.options.map((o, i) => (i === idx ? value : o)) } : q),
    } : c);

  const addQuestion = () =>
    setConfig((c) => c ? {
      ...c,
      questions: [...c.questions, {
        id: `t${trilha}-new-${Date.now()}`,
        text: 'Nova pergunta',
        options: ['Alternativa A', 'Alternativa B', 'Alternativa C', 'Alternativa D'],
        correctIndex: 0,
      }],
    } : c);

  const removeQuestion = (qid: string) =>
    setConfig((c) => c ? { ...c, questions: c.questions.filter((q) => q.id !== qid) } : c);

  const addOption = (qid: string) =>
    setConfig((c) => c ? {
      ...c,
      questions: c.questions.map((q) => q.id === qid ? { ...q, options: [...q.options, `Alternativa ${String.fromCharCode(65 + q.options.length)}`] } : q),
    } : c);

  const removeOption = (qid: string, idx: number) =>
    setConfig((c) => c ? {
      ...c,
      questions: c.questions.map((q) => {
        if (q.id !== qid) return q;
        const options = q.options.filter((_, i) => i !== idx);
        let correctIndex = q.correctIndex || 0;
        if (idx === correctIndex) correctIndex = 0;
        else if (idx < correctIndex) correctIndex -= 1;
        return { ...q, options, correctIndex };
      }),
    } : c);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSavedMsg('');
    try {
      await saveQuiz({ ...config, initiativeId: cursoSelecionado?.id, titulo: nomeCursoSelecionado }, consultorId);
      setSavedMsg('✓ Teste salvo com sucesso.');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (e) {
      console.error('[AdminAvaliacao] salvar:', e);
      setSavedMsg('✗ Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Teste de Avaliação</h1>
          <p className="text-gray-500 text-sm">Configure critérios, perguntas, alternativas e gabarito de cada curso.</p>
        </div>
        {savedMsg && (
          <span className={`text-sm font-bold rounded-full px-3 py-1 ${savedMsg.startsWith('✓') ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
            {savedMsg}
          </span>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="font-black text-gray-900">Depoimento pré-prova — itens avaliados (nota 1-5)</h2>
            <p className="text-xs text-gray-400">Escolha se os alunos devem preencher o depoimento antes dos testes. A opção vale para todos os seus cursos.</p>
          </div>
          <div className="flex items-center gap-2">
            {opiniaoMsg && <span className={`text-sm font-bold ${opiniaoMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{opiniaoMsg}</span>}
            <button onClick={handleSaveItens} className="px-3 py-2 rounded-xl text-white text-sm font-black flex items-center gap-2 border-none cursor-pointer" style={{ background: LBW.blue }}>
              <Save size={15} /> Salvar itens
            </button>
          </div>
        </div>
        <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
          <input
            type="checkbox"
            checked={consultor.depoimentoPreProvaAtivo !== false}
            disabled={salvandoDepoimento}
            onChange={(event) => handleToggleDepoimento(event.target.checked)}
            className="h-5 w-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <div className="text-sm font-bold text-gray-800">Solicitar depoimento antes do teste</div>
            <div className="text-xs text-gray-500">Desmarque para abrir o teste diretamente.</div>
          </div>
        </label>
        <div className="space-y-2">
          {opiniaoItens.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
              <input value={item}
                onChange={(e) => setOpiniaoItens((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
              <button onClick={() => setOpiniaoItens((arr) => arr.filter((_, j) => j !== i))}
                className="p-1.5 text-red-300 hover:text-red-500 border-none bg-transparent cursor-pointer">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setOpiniaoItens((arr) => [...arr, 'Novo item'])}
          className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-3 border-none bg-transparent cursor-pointer">
          <Plus size={13} /> Adicionar item
        </button>
      </div>

      {cursosOrdenados.length === 0 ? (
        <div className="rounded-3xl bg-white border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm font-bold text-gray-700 mb-1">Você ainda não tem nenhum curso cadastrado.</p>
          <p className="text-xs text-gray-500">
            Primeiro adicione um curso em <b>Área do Consultor → Meus Cursos</b>, depois volte aqui para configurar o teste dele.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cursosOrdenados.map((curso, cursoIndex) => {
            const numero = cursoChave(curso, cursoIndex, consultorId);
            const aberto = trilha === numero;
            return (
              <div key={curso.id || curso.name} className={`rounded-3xl border overflow-hidden bg-white shadow-sm transition-all ${aberto ? 'border-blue-200 shadow-blue-100/60' : 'border-gray-200'}`}>
                <button
                  type="button"
                  onClick={() => setTrilha(numero)}
                  className={`w-full border-none cursor-pointer text-left p-5 flex items-center gap-4 ${aberto ? 'bg-gradient-to-r from-blue-50 to-white' : 'bg-white hover:bg-gray-50'}`}
                >
                  <div className={`w-12 h-12 rounded-2xl grid place-items-center shrink-0 ${aberto ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <ClipboardCheck size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400 m-0">Curso {numero}</p>
                    <h2 className="text-lg md:text-xl font-black text-gray-900 m-0 truncate" title={curso.name}>{nomeVisualCurso(curso.name)}</h2>
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-xs font-bold text-gray-500">
                    {aberto && config ? <span>{config.questions.length} perguntas</span> : <span>Clique para configurar</span>}
                  </div>
                  <ChevronDown size={22} className={`text-gray-400 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                </button>

                {aberto && (
                  <div className="border-t border-gray-100 p-5 md:p-6 bg-gray-50/60">
                    {loading || !config ? (
                      <div className="text-gray-400 py-10 text-center">Carregando…</div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                          <div className="rounded-2xl bg-white border border-gray-200 p-4">
                            <div className="flex items-center gap-2 text-gray-500 mb-2">
                              <ClipboardCheck size={16} />
                              <span className="text-[11px] font-black uppercase tracking-wider">Título do teste</span>
                            </div>
                            <p className="font-black text-gray-900 m-0 leading-snug">{nomeCursoSelecionado}</p>
                            <p className="text-[11px] text-gray-400 mt-2 m-0">Nome real cadastrado em Meus Cursos.</p>
                          </div>

                          <label className="rounded-2xl bg-white border border-gray-200 p-4">
                            <div className="flex items-center gap-2 text-gray-500 mb-2">
                              <Target size={16} />
                              <span className="text-[11px] font-black uppercase tracking-wider">% para aprovar</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="number" min={0} max={100} value={Math.round(config.passPct * 100)}
                                onChange={(e) => update({ passPct: Math.min(100, Math.max(0, Number(e.target.value))) / 100 })}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-lg font-black text-gray-900 focus:outline-none focus:border-blue-500" />
                              <span className="text-gray-400 text-sm font-bold">%</span>
                            </div>
                          </label>

                          <label className="rounded-2xl bg-white border border-gray-200 p-4">
                            <div className="flex items-center gap-2 text-gray-500 mb-2">
                              <Video size={16} />
                              <span className="text-[11px] font-black uppercase tracking-wider">% vídeos para liberar</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input type="number" min={0} max={100} value={Math.round(config.watchGatePct * 100)}
                                onChange={(e) => update({ watchGatePct: Math.min(100, Math.max(0, Number(e.target.value))) / 100 })}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-lg font-black text-gray-900 focus:outline-none focus:border-blue-500" />
                              <span className="text-gray-400 text-sm font-bold">%</span>
                            </div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                          <div>
                            <h3 className="font-black text-gray-900 m-0">{config.questions.length} perguntas</h3>
                            <p className="text-xs text-gray-500 m-0">Abra cada pergunta para editar alternativas e marcar a resposta correta.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={addQuestion} className="px-3 py-2 rounded-xl text-white text-sm font-black flex items-center gap-2 border-none cursor-pointer" style={{ background: '#10B981' }}>
                              <Plus size={16} /> Adicionar pergunta
                            </button>
                            <button onClick={handleSave} disabled={saving}
                              className="px-4 py-2 rounded-xl text-white text-sm font-black flex items-center gap-2 disabled:opacity-60 border-none cursor-pointer"
                              style={{ background: LBW.blue }}>
                              <Save size={16} /> {saving ? 'Salvando…' : 'Salvar este curso'}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {config.questions.map((q, qi) => (
                            <QuestionEditor
                              key={q.id} q={q} index={qi}
                              onText={(text) => updateQuestion(q.id, { text })}
                              onOption={(idx, val) => updateOption(q.id, idx, val)}
                              onCorrect={(idx) => updateQuestion(q.id, { correctIndex: idx })}
                              onAddOption={() => addOption(q.id)}
                              onRemoveOption={(idx) => removeOption(q.id, idx)}
                              onRemove={() => removeQuestion(q.id)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuestionEditor({ q, index, onText, onOption, onCorrect, onAddOption, onRemoveOption, onRemove }: {
  q: QuizQuestion; index: number;
  onText: (t: string) => void; onOption: (idx: number, v: string) => void; onCorrect: (idx: number) => void;
  onAddOption: () => void; onRemoveOption: (idx: number) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-sm font-bold flex items-center justify-center shrink-0 mt-1">{index + 1}</span>
        <textarea value={q.text} onChange={(e) => onText(e.target.value)} rows={open ? 2 : 1}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none font-semibold text-gray-800 focus:outline-none focus:border-blue-500" />
        <button onClick={() => setOpen((v) => !v)} className="p-2 text-gray-400 hover:text-gray-600 shrink-0 border-none bg-transparent cursor-pointer">
          <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={onRemove} className="p-2 text-red-300 hover:text-red-500 shrink-0 border-none bg-transparent cursor-pointer" title="Remover pergunta">
          <Trash2 size={16} />
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 pl-14 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Marque a resposta correta:</p>
          {q.options.map((opt, idx) => {
            const correct = idx === q.correctIndex;
            return (
              <div key={idx} className="flex items-center gap-2">
                <button onClick={() => onCorrect(idx)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 cursor-pointer ${correct ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 text-transparent bg-white'}`}
                  title="Marcar como correta">
                  <Check size={14} />
                </button>
                <span className="text-xs font-bold text-gray-400 w-4">{String.fromCharCode(65 + idx)}</span>
                <input value={opt} onChange={(e) => onOption(idx, e.target.value)}
                  className={`flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${correct ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200'}`} />
                {q.options.length > 2 && (
                  <button onClick={() => onRemoveOption(idx)} className="p-1.5 text-red-300 hover:text-red-500 shrink-0 border-none bg-transparent cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
          {q.options.length < 6 && (
            <button onClick={onAddOption} className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-2 border-none bg-transparent cursor-pointer">
              <Plus size={13} /> Adicionar alternativa
            </button>
          )}
        </div>
      )}
    </div>
  );
}
