/**
 * A segunda porta da etapa 3: usar uma aula que JÁ está nos seus cursos.
 *
 * Antes o único caminho era enviar um arquivo novo para o Bunny — e havia 849
 * aulas já hospedadas, 848 delas já transcritas, paradas. O formato da fala do
 * curso (`[MM:SS] fala`) é exatamente o que o recortador espera, então não há
 * conversão nenhuma: é ligar uma coisa na outra.
 *
 * TRÊS SELETORES, não dois. O Black Belt tem 253 aulas em 22 módulos; uma lista
 * plana de 253 linhas é pior do que não ter lista. Curso → módulo → aula.
 *
 * A aula NÃO é copiada, é apontada (ver `knowledgeBaseId` no tipo VideoFonte).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, Loader2, Plus } from 'lucide-react';
import { auth } from '../../../lib/firebase';

interface Aula {
  id: string;
  titulo: string;
  ordem: number;
  temResumo: boolean;
}
interface Modulo { modulo: string; aulas: Aula[] }
interface Curso { curso: string; modulos: Modulo[]; total: number }

export function EscolherVideoDoCurso({ onUsado }: { onUsado: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const [curso, setCurso] = useState('');
  const [modulo, setModulo] = useState('');
  const [aula, setAula] = useState('');
  const [usando, setUsando] = useState(false);

  // Só busca o catálogo quando o painel abre: são 849 aulas, e quem só quer
  // enviar um arquivo novo não precisa pagar essa leitura.
  useEffect(() => {
    if (!aberto || cursos.length || carregando) return;
    let vivo = true;
    (async () => {
      setCarregando(true);
      setErro('');
      try {
        const user = auth.currentUser;
        const token = user ? await user.getIdToken() : '';
        const r = await fetch('/api/marketing-consultor/cursos', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const corpo = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(corpo.error || `HTTP ${r.status}`);
        if (!vivo) return;
        setCursos(corpo.cursos || []);
      } catch (e: any) {
        if (vivo) setErro(e?.message || String(e));
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
  }, [aberto, cursos.length, carregando]);

  const modulosDoCurso = useMemo(
    () => cursos.find((c) => c.curso === curso)?.modulos || [],
    [cursos, curso],
  );
  const aulasDoModulo = useMemo(
    () => modulosDoCurso.find((m) => m.modulo === modulo)?.aulas || [],
    [modulosDoCurso, modulo],
  );

  // Trocar de curso invalida o módulo, e trocar de módulo invalida a aula:
  // sem isto sobrava uma escolha que não existe mais no nível de cima.
  function escolherCurso(valor: string) {
    setCurso(valor);
    setModulo('');
    setAula('');
    setAviso('');
  }
  function escolherModulo(valor: string) {
    setModulo(valor);
    setAula('');
    setAviso('');
  }

  async function usar() {
    if (!aula) return;
    setUsando(true);
    setErro('');
    setAviso('');
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';
      const r = await fetch('/api/marketing-consultor/usar-video-do-curso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ knowledgeBaseId: aula }),
      });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(corpo.error || `HTTP ${r.status}`);
      // O Reel falado precisa do tempo de cada palavra, que a aula do curso não
      // tem. Dizer isso agora evita o consultor descobrir clicando e falhando.
      setAviso(
        corpo.precisaRetranscreverParaReel
          ? 'Aula adicionada. Carrossel, PDF, imagem e texto já podem ser gerados. O Reel falado precisa da transcrição com o tempo de cada palavra — para tê-lo, gere a transcrição de novo neste vídeo.'
          : 'Aula adicionada.',
      );
      setAula('');
      onUsado();
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setUsando(false);
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-blue-300 bg-white text-blue-700 text-sm font-semibold hover:bg-blue-50"
      >
        <BookOpen className="w-4 h-4" />
        Usar um vídeo dos meus cursos
      </button>
    );
  }

  return (
    <section className="p-4 rounded-lg border border-blue-200 bg-blue-50/40">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-700" />
          Usar um vídeo dos meus cursos
        </h3>
        <button onClick={() => setAberto(false)} className="text-xs text-gray-600 hover:underline">
          Fechar
        </button>
      </div>

      {carregando && (
        <p className="text-sm text-gray-600 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Lendo os seus cursos…
        </p>
      )}

      {!carregando && cursos.length > 0 && (
        <div className="space-y-2">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Curso</label>
            <select
              value={curso}
              onChange={(e) => escolherCurso(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
            >
              <option value="">Escolha o curso…</option>
              {cursos.map((c) => (
                <option key={c.curso} value={c.curso}>{c.curso} ({c.total})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Módulo</label>
            <select
              value={modulo}
              onChange={(e) => escolherModulo(e.target.value)}
              disabled={!curso}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">{curso ? 'Escolha o módulo…' : 'Escolha o curso primeiro'}</option>
              {modulosDoCurso.map((m) => (
                <option key={m.modulo} value={m.modulo}>{m.modulo} ({m.aulas.length})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Aula</label>
            <select
              value={aula}
              onChange={(e) => { setAula(e.target.value); setAviso(''); }}
              disabled={!modulo}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">{modulo ? 'Escolha a aula…' : 'Escolha o módulo primeiro'}</option>
              {aulasDoModulo.map((a) => (
                <option key={a.id} value={a.id}>{a.titulo}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={usar}
              disabled={!aula || usando}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {usando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Adicionando…</>
                : <><Plus className="w-4 h-4" /> Usar esta aula</>}
            </button>
          </div>
        </div>
      )}

      {!carregando && !erro && cursos.length === 0 && (
        <p className="text-sm text-gray-600">
          Nenhuma aula com transcrição encontrada nos seus cursos.
        </p>
      )}

      {erro && <p className="text-sm text-red-700 mt-2">{erro}</p>}
      {aviso && (
        <p className="text-sm text-blue-900 mt-3 p-2.5 rounded bg-white border border-blue-200 flex items-start gap-2">
          <Check className="w-4 h-4 mt-0.5 shrink-0 text-green-700" />
          <span>{aviso}</span>
        </p>
      )}
    </section>
  );
}
