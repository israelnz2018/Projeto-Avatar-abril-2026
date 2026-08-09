/**
 * AvaliacaoAdminView — configuração das provas do consultor.
 *
 * Permite ao Israel:
 *   - Escolher o curso (mantém a numeração 1..8 internamente).
 *   - Definir os critérios do topo: % de aprovação e % de vídeos para liberar a prova.
 *   - O título da prova é o nome do curso e não é editável aqui.
 *   - Para cada pergunta: editar o enunciado, as 4 alternativas e MARCAR a correta (radio).
 *   - Adicionar/remover perguntas e adicionar/remover alternativas.
 *   - Salvar no Firestore (passa a ter prioridade sobre o seed).
 *
 * Tudo o que o admin faz aqui reflete imediatamente na aba do aluno.
 */

import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Check, ChevronDown } from 'lucide-react';
import { getQuiz, saveQuiz, type QuizConfig, type QuizQuestion } from '../services/quizService';
import { getOpiniaoItens, saveOpiniaoItens } from '../services/opiniaoService';
import { resolveConsultorId } from '../services/consultorService';
import { getInitiatives } from '../services/configService';
import { useConsultor } from '../contexts/ConsultorContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Initiative } from '../types';

const LBW = { navy: '#1E2D6E', blue: '#0033CC' };

export default function AvaliacaoAdminView() {
  const consultorId = resolveConsultorId(); // prova escopada pelo consultor do site
  const { consultor, refresh } = useConsultor();
  const [trilha, setTrilha] = useState(1);
  const [cursos, setCursos] = useState<Initiative[]>([]);
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  // Itens de opinião (depoimento pré-prova) — config global editável.
  const [opiniaoItens, setOpiniaoItens] = useState<string[]>([]);
  const [opiniaoMsg, setOpiniaoMsg] = useState('');
  const [salvandoDepoimento, setSalvandoDepoimento] = useState(false);

  const cursoNumero = (nome: string) => Number(nome.match(/\d+/)?.[0] || 0);
  const cursosOrdenados = [...cursos]
    .filter((curso) => cursoNumero(curso.name) > 0)
    .sort((a, b) => cursoNumero(a.name) - cursoNumero(b.name));
  const cursoSelecionado = cursosOrdenados.find((curso) => cursoNumero(curso.name) === trilha);
  const nomeCursoSelecionado = cursoSelecionado?.name || config?.titulo || `Curso ${trilha}`;

  useEffect(() => {
    getInitiatives().then(setCursos).catch(() => setCursos([]));
  }, []);

  useEffect(() => {
    getOpiniaoItens().then(setOpiniaoItens).catch(() => {});
  }, []);

  const handleSaveItens = async () => {
    try {
      await saveOpiniaoItens(opiniaoItens);
      setOpiniaoMsg('✓ Itens salvos.');
      setTimeout(() => setOpiniaoMsg(''), 3000);
    } catch { setOpiniaoMsg('✗ Erro ao salvar itens.'); }
  };

  useEffect(() => {
    setLoading(true);
    getQuiz(trilha, consultorId)
      .then((quiz) => setConfig({ ...quiz, titulo: cursoSelecionado?.name || quiz.titulo }))
      .catch((e) => console.error('[AdminAvaliacao] getQuiz:', e))
      .finally(() => setLoading(false));
  }, [trilha, consultorId, cursoSelecionado?.name]);

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
        id: `t${trilha}-new-${c.questions.length + 1}-${c.questions.length}`,
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
        let correctIndex = q.correctIndex;
        if (idx === q.correctIndex) correctIndex = 0;
        else if (idx < q.correctIndex) correctIndex -= 1;
        return { ...q, options, correctIndex };
      }),
    } : c);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true); setSavedMsg('');
    try {
      await saveQuiz({ ...config, titulo: nomeCursoSelecionado }, consultorId);
      setSavedMsg('✓ Prova salva com sucesso.');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (e) {
      console.error('[AdminAvaliacao] salvar:', e);
      setSavedMsg('✗ Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teste de Avaliação</h1>
          <p className="text-gray-500 text-sm">Edite os critérios, perguntas, alternativas e o gabarito de cada curso.</p>
        </div>
        <div className="flex items-center gap-2">
          {savedMsg && <span className={`text-sm font-bold ${savedMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{savedMsg}</span>}
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60"
            style={{ background: LBW.blue }}>
            <Save size={16} /> {saving ? 'Salvando…' : 'Salvar prova'}
          </button>
        </div>
      </div>

      {/* Itens do depoimento (opinião pré-prova) — global, editável */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="font-bold text-gray-800">Depoimento pré-prova — itens avaliados (nota 1-5)</h2>
            <p className="text-xs text-gray-400">Escolha se os alunos devem preencher o depoimento antes das provas. A opção vale para todos os seus cursos.</p>
          </div>
          <div className="flex items-center gap-2">
            {opiniaoMsg && <span className={`text-sm font-bold ${opiniaoMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{opiniaoMsg}</span>}
            <button onClick={handleSaveItens} className="px-3 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2" style={{ background: LBW.blue }}>
              <Save size={15} /> Salvar itens
            </button>
          </div>
        </div>
        <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
          <input
            type="checkbox"
            checked={consultor.depoimentoPreProvaAtivo !== false}
            disabled={salvandoDepoimento}
            onChange={(event) => handleToggleDepoimento(event.target.checked)}
            className="h-5 w-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <div className="text-sm font-bold text-gray-800">Solicitar depoimento antes da prova</div>
            <div className="text-xs text-gray-500">Desmarque para abrir a avaliação diretamente.</div>
          </div>
        </label>
        <div className="space-y-2">
          {opiniaoItens.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
              <input value={item}
                onChange={(e) => setOpiniaoItens((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
              <button onClick={() => setOpiniaoItens((arr) => arr.filter((_, j) => j !== i))}
                className="p-1.5 text-red-300 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setOpiniaoItens((arr) => [...arr, 'Novo item'])}
          className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-3">
          <Plus size={13} /> Adicionar item
        </button>
      </div>

      {/* Seletor de curso (a prova continua usando o número internamente). Sem curso
          cadastrado ainda, não faz sentido mostrar 8 abas fictícias — avisa em vez disso. */}
      {cursosOrdenados.length === 0 ? (
        <div className="rounded-2xl bg-white border border-dashed border-gray-300 p-6 text-center mb-6">
          <p className="text-sm font-bold text-gray-700 mb-1">Você ainda não tem nenhum curso cadastrado.</p>
          <p className="text-xs text-gray-500">
            Primeiro adicione um curso em <b>Configuração → Meus Cursos</b>, depois volte aqui pra configurar a prova dele.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-6">
          {cursosOrdenados.map((curso) => ({ numero: cursoNumero(curso.name), nome: curso.name })).map(({ numero, nome }) => (
            <button key={numero} onClick={() => setTrilha(numero)}
              className={`max-w-[260px] truncate px-4 py-2 rounded-lg text-sm font-bold ${trilha === numero ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
              style={trilha === numero ? { background: LBW.navy } : {}}
              title={nome}>
              {nome.replace(/^\d+\s*[-—]?\s*/, '')}
            </button>
          ))}
        </div>
      )}

      {cursosOrdenados.length === 0 ? null : loading || !config ? (
        <div className="text-gray-400 py-10 text-center">Carregando…</div>
      ) : (
        <>
          {/* Critérios do topo */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
            <h2 className="font-bold text-gray-800 mb-4">Critérios do curso: {nomeCursoSelecionado.replace(/^\d+\s*[-—]?\s*/, '')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="block">
                <span className="text-xs font-bold text-gray-500 uppercase">Título da prova</span>
                <div className="mt-1 min-h-[38px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                  {nomeCursoSelecionado.replace(/^\d+\s*[-—]?\s*/, '')}
                </div>
                <p className="mt-1 text-[10px] text-gray-400">Definido pelo nome do curso e não pode ser alterado aqui.</p>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-gray-500 uppercase">% para aprovar</span>
                <div className="flex items-center gap-2 mt-1">
                  <input type="number" min={0} max={100} value={Math.round(config.passPct * 100)}
                    onChange={(e) => update({ passPct: Math.min(100, Math.max(0, Number(e.target.value))) / 100 })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <span className="text-gray-400 text-sm">%</span>
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-500 uppercase">% vídeos p/ liberar</span>
                <div className="flex items-center gap-2 mt-1">
                  <input type="number" min={0} max={100} value={Math.round(config.watchGatePct * 100)}
                    onChange={(e) => update({ watchGatePct: Math.min(100, Math.max(0, Number(e.target.value))) / 100 })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <span className="text-gray-400 text-sm">%</span>
                </div>
              </label>
            </div>
          </div>

          {/* Perguntas */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800">{config.questions.length} perguntas</h2>
            <button onClick={addQuestion} className="px-3 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2" style={{ background: '#10B981' }}>
              <Plus size={16} /> Adicionar pergunta
            </button>
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
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none font-semibold text-gray-800" />
        <button onClick={() => setOpen((v) => !v)} className="p-2 text-gray-400 hover:text-gray-600 shrink-0">
          <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={onRemove} className="p-2 text-red-300 hover:text-red-500 shrink-0" title="Remover pergunta">
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
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 ${correct ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 text-transparent'}`}
                  title="Marcar como correta">
                  <Check size={14} />
                </button>
                <span className="text-xs font-bold text-gray-400 w-4">{String.fromCharCode(65 + idx)}</span>
                <input value={opt} onChange={(e) => onOption(idx, e.target.value)}
                  className={`flex-1 border rounded-lg px-3 py-1.5 text-sm ${correct ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200'}`} />
                {q.options.length > 2 && (
                  <button onClick={() => onRemoveOption(idx)} className="p-1.5 text-red-300 hover:text-red-500 shrink-0">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
          {q.options.length < 6 && (
            <button onClick={onAddOption} className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-2">
              <Plus size={13} /> Adicionar alternativa
            </button>
          )}
        </div>
      )}
    </div>
  );
}
