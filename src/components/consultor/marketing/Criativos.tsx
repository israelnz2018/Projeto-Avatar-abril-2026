/**
 * Criativos — os trechos do vídeo que viram peça.
 *
 * A IA lê a transcrição e propõe os recortes; o consultor decide o que fica.
 * Revisar faz duas coisas, e só duas: CORRIGIR uma palavra que a transcrição ouviu
 * errado, e APAGAR uma fala inteira. Não se edita meia fala — o texto tem que
 * continuar sendo o que a pessoa falou, com o tempo dela colado nele.
 *
 * Apagar é marcar o índice, não remover: o trecho inteiro fica guardado, então dá
 * pra apagar demais e voltar atrás sem gerar tudo de novo.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import {
  Check, Pencil, Trash2, Loader2, Sparkles, RotateCcw, Clock, X,
} from 'lucide-react';
import { auth, db } from '../../../lib/firebase';
import {
  COLECOES, Criativo, VideoFonte, duracaoCriativo, linhasEmUso, textoCriativo,
  inicioNoVideo, fimNoVideo, linhasApagadasDe, temBuraco, pedacosDeVideo,
} from '../../../types/marketing';

/* ====================== Leitura ====================== */

export function useCriativos(consultorId: string) {
  const [criativos, setCriativos] = useState<Criativo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!consultorId) return;
    let vivo = true;
    (async () => {
      try {
        const snap = await getDocs(query(
          collection(db, COLECOES.criativos),
          where('consultorId', '==', consultorId),
        ));
        if (!vivo) return;
        setCriativos(snap.docs.map((d) => d.data() as Criativo));
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
  }, [consultorId, versao]);

  return { criativos, carregando, recarregar: () => setVersao((v) => v + 1) };
}

/* ====================== Etapa 3 — painel de criativos ====================== */

export function PainelCriativos({
  videos, criativos, carregando, onMudou,
}: {
  videos: VideoFonte[];
  criativos: Criativo[];
  carregando: boolean;
  onMudou: () => void;
}) {
  const [videoId, setVideoId] = useState('');
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const [relatorio, setRelatorio] = useState('');

  // Abre já no primeiro vídeo: o caso comum é ter poucos, e cair numa tela vazia
  // que exige um clique pra mostrar qualquer coisa é ruim.
  useEffect(() => {
    if (!videoId && videos.length) setVideoId(videos[0].id);
  }, [videos, videoId]);

  const video = videos.find((v) => v.id === videoId);
  const doVideo = useMemo(
    () => criativos.filter((c) => c.videoId === videoId).sort((a, b) => a.ordem - b.ordem),
    [criativos, videoId],
  );

  async function gerar() {
    if (!videoId) return;
    setGerando(true);
    setErro('');
    setRelatorio('');
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';
      const r = await fetch('/api/marketing-consultor/gerar-criativos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ videoId }),
      });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(corpo.error || `HTTP ${r.status}`);

      // Sem esta prestação de contas não dá pra saber se "vieram poucos" foi
      // julgamento da IA ou filtro da plataforma jogando candidato fora calado.
      const d = corpo.descartes || {};
      const motivos = [
        d.duracao ? `${d.duracao} fora da faixa de duração` : '',
        d.poucasFalas ? `${d.poucasFalas} curtos demais na transcrição` : '',
        d.tempoInvalido ? `${d.tempoInvalido} com tempo inválido` : '',
        d.jaAprovado ? `${d.jaAprovado} já aprovados antes` : '',
      ].filter(Boolean);
      setRelatorio(
        `A IA propôs ${corpo.propostos} trecho(s) e ${corpo.criativos?.length ?? 0} entraram na lista`
        + (motivos.length ? `. Descartados: ${motivos.join(', ')}.` : '.')
        + (corpo.aprovadosMantidos ? ` ${corpo.aprovadosMantidos} aprovado(s) anterior(es) foram preservados.` : ''),
      );
      onMudou();
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setGerando(false);
    }
  }

  if (!videos.length) return null;

  return (
    <section className="pt-6 mt-6 border-t border-gray-200">
      <h3 className="text-base font-bold text-gray-900">Criativos</h3>
      <p className="text-sm text-gray-600 mt-1 mb-3">
        Escolha um vídeo para ver os trechos que dão um vídeo curto. Aprove os que
        prestam, apare as pontas dos que quase prestam, apague o resto.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={videoId}
          onChange={(e) => setVideoId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm max-w-md"
        >
          {videos.map((v) => (
            <option key={v.id} value={v.id}>{v.titulo}</option>
          ))}
        </select>

        {video && (
          <button
            onClick={gerar}
            disabled={gerando || !video.temTranscricao}
            title={video.temTranscricao ? undefined : 'Este vídeo ainda não tem transcrição.'}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {gerando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Procurando trechos…</>
              : <><Sparkles className="w-4 h-4" /> {doVideo.length ? 'Gerar de novo' : 'Gerar criativos'}</>}
          </button>
        )}
      </div>

      {erro && <p className="text-sm text-red-700 mb-3">{erro}</p>}
      {relatorio && (
        <p className="text-xs text-gray-600 mb-3 p-2 rounded bg-gray-50 border border-gray-200">
          {relatorio}
        </p>
      )}

      {video && !video.temTranscricao && (
        <p className="text-sm text-amber-800 p-3 rounded-lg bg-amber-50 border border-amber-200">
          Este vídeo não tem transcrição, e é dela que saem os criativos. Envie o
          vídeo pela plataforma para que ela transcreva sozinha.
        </p>
      )}

      {carregando
        ? <p className="text-sm text-gray-500">Carregando…</p>
        : doVideo.length === 0
          ? (
            <p className="text-sm text-gray-500 italic p-4 rounded-lg bg-gray-50 border border-dashed border-gray-300">
              Nenhum criativo ainda para este vídeo.
            </p>
          )
          : (
            <div className="space-y-3">
              {doVideo.map((c) => <CartaoCriativo key={c.id} criativo={c} onMudou={onMudou} />)}
            </div>
          )}

      {doVideo.length > 0 && (
        <p className="text-xs text-gray-500 mt-3">
          {doVideo.filter((c) => c.status === 'aprovado').length} de {doVideo.length} aprovados.
          Os aprovados aparecem na etapa 4.
        </p>
      )}
    </section>
  );
}

/* ====================== Um criativo ====================== */

const ROTULO_STATUS: Record<Criativo['status'], { texto: string; classe: string }> = {
  novo: { texto: 'Novo', classe: 'bg-gray-100 text-gray-700' },
  revisar: { texto: 'Em revisão', classe: 'bg-amber-100 text-amber-800' },
  aprovado: { texto: 'Aprovado', classe: 'bg-green-600 text-white' },
};

function CartaoCriativo({ criativo, onMudou }: { criativo: Criativo; onMudou: () => void }) {
  const [revisando, setRevisando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  // Falas apagadas e correções ficam em rascunho: só vão pro Firestore quando o
  // consultor salva, pra ele poder experimentar e desistir.
  const [apagadas, setApagadas] = useState<number[]>([...linhasApagadasDe(criativo)]);
  const [titulo, setTitulo] = useState(criativo.titulo);
  const [edicoes, setEdicoes] = useState<Record<string, string>>(criativo.edicoes || {});
  const [erroSalvar, setErroSalvar] = useState('');

  const previa: Criativo = { ...criativo, linhasApagadas: apagadas, edicoes };
  const rotulo = ROTULO_STATUS[criativo.status];
  const aprovado = criativo.status === 'aprovado';

  async function mudarStatus(status: Criativo['status']) {
    setOcupado(true);
    try {
      await updateDoc(doc(db, COLECOES.criativos, criativo.id), {
        status,
        atualizadoEm: new Date().toISOString(),
      });
      onMudou();
    } finally {
      setOcupado(false);
    }
  }

  async function apagar() {
    setOcupado(true);
    try {
      await deleteDoc(doc(db, COLECOES.criativos, criativo.id));
      onMudou();
    } finally {
      setOcupado(false);
    }
  }

  async function salvarCorte() {
    setOcupado(true);
    try {
      // Correção igual ao original não é correção: guardá-la só encheria o documento
      // e faria a linha parecer editada quando não foi.
      const limpas: Record<string, string> = {};
      for (const [i, texto] of Object.entries(edicoes)) {
        const t = texto.trim();
        if (t && t !== criativo.linhas[Number(i)]?.texto) limpas[i] = t;
      }
      // Criativo sem nenhuma fala não é criativo: viraria um cartão de 0:00 que nunca
      // dá peça. Quem quer se livrar do trecho inteiro usa a lixeira do cartão.
      if (apagadas.length >= criativo.linhas.length) {
        setErroSalvar('Você apagou todas as falas. Traga alguma de volta, ou apague o criativo inteiro pela lixeira do topo.');
        return;
      }
      setErroSalvar('');
      await updateDoc(doc(db, COLECOES.criativos, criativo.id), {
        linhasApagadas: [...apagadas].sort((a, b) => a - b),
        titulo: titulo.trim() || criativo.titulo,
        edicoes: limpas,
        status: 'revisar',
        atualizadoEm: new Date().toISOString(),
      });
      setRevisando(false);
      onMudou();
    } finally {
      setOcupado(false);
    }
  }

  function abrirRevisao() {
    setApagadas([...linhasApagadasDe(criativo)]);
    setErroSalvar('');
    setTitulo(criativo.titulo);
    setEdicoes(criativo.edicoes || {});
    setRevisando(true);
  }

  function alternarApagada(i: number) {
    setApagadas((atual) => (atual.includes(i) ? atual.filter((x) => x !== i) : [...atual, i]));
  }

  return (
    <div className={`p-4 rounded-lg border bg-white ${aprovado ? 'border-green-300' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${rotulo.classe}`}>
              {rotulo.texto}
            </span>
          </div>

          {/* O TRECHO é o cabeçalho, não o título: o que identifica um criativo é
              onde ele está na aula — dá pra ir no vídeo e conferir. O nome que a IA
              inventou é secundário, e muda a cada geração. */}
          <p className="font-bold text-gray-900 mt-1.5 flex items-center gap-1.5 flex-wrap">
            <Clock className="w-4 h-4 text-gray-400" />
            {formatarDuracao(inicioNoVideo(previa))} – {formatarDuracao(fimNoVideo(previa))}
            <span className="font-normal text-gray-500">
              · {formatarDuracao(duracaoCriativo(previa))} de vídeo
            </span>
          </p>

          {revisando
            ? (
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Nome do criativo (opcional)"
                className="mt-2 w-full px-2 py-1 rounded border border-gray-300 text-sm text-gray-700"
              />
            )
            : criativo.titulo && <p className="text-sm text-gray-500 mt-0.5">{criativo.titulo}</p>}
        </div>

        {/* Ações à direita, na mesma linha do título: a lista pode ficar longa e
            manter os botões alinhados torna a varredura vertical muito mais rápida. */}
        {!revisando && (
          <div className="flex items-center gap-1 shrink-0">
            {aprovado
              ? (
                <BotaoAcao onClick={() => mudarStatus('novo')} disabled={ocupado} titulo="Desfazer aprovação">
                  <RotateCcw className="w-4 h-4" />
                </BotaoAcao>
              )
              : (
                <BotaoAcao onClick={() => mudarStatus('aprovado')} disabled={ocupado} titulo="Aprovar" cor="verde">
                  <Check className="w-4 h-4" />
                </BotaoAcao>
              )}
            <BotaoAcao onClick={abrirRevisao} disabled={ocupado} titulo="Revisar — apara o começo e o fim">
              <Pencil className="w-4 h-4" />
            </BotaoAcao>
            <BotaoAcao onClick={apagar} disabled={ocupado} titulo="Deletar" cor="vermelho">
              <Trash2 className="w-4 h-4" />
            </BotaoAcao>
          </div>
        )}
      </div>

      {revisando
        ? (
          <div className="mt-3">
            <p className="text-xs text-gray-600 mb-2">
              Duas coisas aqui: <strong>corrigir</strong> uma palavra que a transcrição
              ouviu errado (escreva por cima) e <strong>apagar</strong> uma fala que não
              deve entrar (lixeira). Nada é perdido — clique de novo para trazer de volta.
            </p>
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {criativo.linhas.map((linha, i) => {
                const fora = apagadas.includes(i);
                const corrigida = edicoes[String(i)] !== undefined && edicoes[String(i)] !== linha.texto;
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2 px-2 py-1.5 text-sm ${fora ? 'bg-gray-50' : ''}`}
                  >
                    <span className="text-xs font-mono text-gray-400 shrink-0 mt-1.5 w-10 text-right">
                      {formatarDuracao(linha.inicio)}
                    </span>
                    <input
                      value={edicoes[String(i)] ?? linha.texto}
                      onChange={(e) => setEdicoes({ ...edicoes, [String(i)]: e.target.value })}
                      disabled={fora}
                      title={corrigida ? `Você corrigiu. A transcrição ouviu: ${linha.texto}` : undefined}
                      className={`flex-1 min-w-0 bg-transparent px-1 py-1 rounded border
                        focus:outline-none focus:border-blue-400 focus:bg-white
                        ${fora
                          ? 'text-gray-400 line-through border-transparent'
                          : corrigida
                            ? 'text-gray-800 border-blue-300 bg-blue-50/50'
                            : 'text-gray-800 border-transparent hover:border-gray-200'}`}
                    />
                    <button
                      onClick={() => alternarApagada(i)}
                      title={fora ? 'Trazer esta fala de volta' : 'Apagar esta fala'}
                      className={`p-1.5 rounded shrink-0 ${fora
                        ? 'text-blue-600 hover:bg-blue-50'
                        : 'text-gray-300 hover:text-red-600 hover:bg-red-50'}`}
                    >
                      {fora ? <RotateCcw className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Apagar do meio parte o trecho em dois, e o renderizador de hoje corta
                um pedaço contínuo só. Avisar aqui é melhor do que deixar o consultor
                descobrir na hora em que a peça sair diferente do que ele montou. */}
            {temBuraco(previa) && (
              <p className="mt-2 text-xs text-amber-800 p-2 rounded bg-amber-50 border border-amber-200">
                Você apagou uma fala do meio, então o trecho ficou em{' '}
                {pedacosDeVideo(previa).length} pedaços. O texto (legenda, PDF, carrossel) já
                sai certo assim. O <strong>vídeo</strong> ainda não: hoje ele corta um pedaço
                contínuo só, e emendar pedaços é coisa que ainda não foi construída.
              </p>
            )}

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <button
                onClick={salvarCorte}
                disabled={ocupado}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {ocupado && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Salvar
              </button>
              <button
                onClick={() => { setApagadas([]); setEdicoes({}); }}
                title="Volta ao texto e às falas que a transcrição entregou"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restaurar tudo
              </button>
              {apagadas.length > 0 && (
                <span className="text-xs text-gray-600 font-semibold">
                  {apagadas.length} fala(s) apagada(s)
                </span>
              )}
              {Object.keys(edicoes).length > 0 && (
                <span className="text-xs text-blue-700 font-semibold">
                  {Object.keys(edicoes).length} fala(s) corrigida(s)
                </span>
              )}
              {erroSalvar && (
                <p className="w-full text-sm text-red-700">{erroSalvar}</p>
              )}
              <button
                onClick={() => setRevisando(false)}
                className="flex items-center gap-1 px-2 py-1.5 text-sm font-semibold text-gray-600"
              >
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
            </div>
          </div>
        )
        : <p className="text-sm text-gray-700 mt-2 leading-relaxed">{textoCriativo(criativo)}</p>}
    </div>
  );
}

function BotaoAcao({
  onClick, disabled, titulo, cor, children,
}: {
  onClick: () => void;
  disabled?: boolean;
  titulo: string;
  cor?: 'verde' | 'vermelho';
  children: React.ReactNode;
}) {
  const cores = cor === 'verde'
    ? 'text-gray-400 hover:text-green-700 hover:bg-green-50'
    : cor === 'vermelho'
      ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
      : 'text-gray-400 hover:text-blue-700 hover:bg-blue-50';
  return (
    <button onClick={onClick} disabled={disabled} title={titulo}
      className={`p-2 rounded-lg disabled:opacity-40 ${cores}`}>
      {children}
    </button>
  );
}

/* ====================== Etapa 4 — criativos aprovados ====================== */

export function EtapaCriativosAprovados({
  criativos, videos, onMudou,
}: {
  criativos: Criativo[];
  videos: VideoFonte[];
  onMudou: () => void;
}) {
  const aprovados = criativos
    .filter((c) => c.status === 'aprovado')
    .sort((a, b) => a.videoId.localeCompare(b.videoId) || a.ordem - b.ordem);

  if (!aprovados.length) {
    return (
      <p className="text-sm text-gray-500 italic p-4 rounded-lg bg-gray-50 border border-dashed border-gray-300">
        Nenhum criativo aprovado ainda. Aprove na etapa 3 e eles aparecem aqui.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        {aprovados.length} criativo{aprovados.length === 1 ? '' : 's'} aprovado
        {aprovados.length === 1 ? '' : 's'}, prontos para virar peça.
      </p>
      {aprovados.map((c) => {
        const video = videos.find((v) => v.id === c.videoId);
        return (
          <div key={c.id} className="p-4 rounded-lg border border-green-200 bg-green-50/40">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-gray-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {formatarDuracao(inicioNoVideo(c))} – {formatarDuracao(fimNoVideo(c))}
                  <span className="font-normal text-gray-500">
                    · {formatarDuracao(duracaoCriativo(c))} de vídeo
                  </span>
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {video?.titulo}
                  {c.titulo ? ` · ${c.titulo}` : ''}
                </p>
              </div>
              <BotaoAcao
                onClick={async () => {
                  await updateDoc(doc(db, COLECOES.criativos, c.id), {
                    status: 'novo',
                    atualizadoEm: new Date().toISOString(),
                  });
                  onMudou();
                }}
                titulo="Tirar da lista de aprovados"
              >
                <RotateCcw className="w-4 h-4" />
              </BotaoAcao>
            </div>
            <p className="text-sm text-gray-700 mt-2 leading-relaxed">{textoCriativo(c)}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ====================== Auxiliares ====================== */

function formatarDuracao(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = Math.round(segundos % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
