/**
 * Criativos — os trechos do vídeo que viram peça.
 *
 * A IA lê a transcrição e propõe os recortes; o consultor decide o que fica.
 * Revisar aqui NÃO é reescrever o texto: é aparar as pontas. O criativo tem que
 * continuar sendo o que a pessoa realmente falou no vídeo — só que começando e
 * terminando na hora certa.
 *
 * O aparo é por índice de linha, não apagando linha: o trecho inteiro fica
 * guardado, então dá pra cortar demais e voltar atrás sem gerar tudo de novo.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import {
  Check, Pencil, Trash2, Loader2, Sparkles, Scissors, RotateCcw, Clock, X,
} from 'lucide-react';
import { auth, db } from '../../../lib/firebase';
import {
  COLECOES, Criativo, VideoFonte, duracaoCriativo, linhasEmUso, textoCriativo,
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

  // Aparo e correções em rascunho: só vão pro Firestore quando o consultor salva,
  // pra ele poder experimentar e desistir.
  const [inicio, setInicio] = useState(criativo.corteInicio);
  const [fim, setFim] = useState(criativo.corteFim);
  const [titulo, setTitulo] = useState(criativo.titulo);
  const [edicoes, setEdicoes] = useState<Record<string, string>>(criativo.edicoes || {});

  const previa = { ...criativo, corteInicio: inicio, corteFim: fim, edicoes };
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
      await updateDoc(doc(db, COLECOES.criativos, criativo.id), {
        corteInicio: inicio,
        corteFim: fim,
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
    setInicio(criativo.corteInicio);
    setFim(criativo.corteFim);
    setTitulo(criativo.titulo);
    setEdicoes(criativo.edicoes || {});
    setRevisando(true);
  }

  return (
    <div className={`p-4 rounded-lg border bg-white ${aprovado ? 'border-green-300' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${rotulo.classe}`}>
              {rotulo.texto}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600">
              <Clock className="w-3.5 h-3.5" /> {formatarDuracao(duracaoCriativo(previa))}
            </span>
          </div>

          {revisando
            ? (
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="mt-2 w-full px-2 py-1 rounded border border-gray-300 font-bold text-gray-900"
              />
            )
            : <p className="font-bold text-gray-900 mt-1.5">{criativo.ordem}. {criativo.titulo}</p>}
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
              Tesoura da esquerda: <strong>começa</strong> naquela fala. Da direita:{' '}
              <strong>termina</strong> nela. O que sair do corte fica apagado — nada é perdido.
              Para consertar uma palavra, escreva por cima:{' '}
              <strong>é esse texto que vale daqui pra frente</strong> — legenda do Reel, PDF, capa, tudo.
            </p>
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {criativo.linhas.map((linha, i) => {
                const dentro = i >= inicio && i <= fim;
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2 px-2 py-1.5 text-sm ${dentro ? '' : 'opacity-40 bg-gray-50'}`}
                  >
                    <button
                      onClick={() => { setInicio(i); if (fim < i) setFim(i); }}
                      title="Começar aqui"
                      className="p-1 text-gray-400 hover:text-blue-700 shrink-0"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-mono text-gray-400 shrink-0 mt-0.5 w-10 text-right">
                      {formatarDuracao(linha.inicio)}
                    </span>
                    <input
                      value={edicoes[String(i)] ?? linha.texto}
                      onChange={(e) => setEdicoes({ ...edicoes, [String(i)]: e.target.value })}
                      disabled={!dentro}
                      title={
                        edicoes[String(i)] !== undefined && edicoes[String(i)] !== linha.texto
                          ? `Você corrigiu. A transcrição ouviu: ${linha.texto}`
                          : undefined
                      }
                      className={`flex-1 min-w-0 bg-transparent px-1 py-0.5 rounded border text-gray-800
                        focus:outline-none focus:border-blue-400 focus:bg-white
                        ${edicoes[String(i)] !== undefined && edicoes[String(i)] !== linha.texto
                          ? 'border-blue-300 bg-blue-50/50'
                          : 'border-transparent hover:border-gray-200'}`}
                    />
                    <button
                      onClick={() => { setFim(i); if (inicio > i) setInicio(i); }}
                      title="Terminar aqui"
                      className="p-1 text-gray-400 hover:text-blue-700 shrink-0"
                    >
                      <Scissors className="w-3.5 h-3.5 rotate-90" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={salvarCorte}
                disabled={ocupado}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {ocupado && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Salvar corte
              </button>
              <button
                onClick={() => { setInicio(0); setFim(criativo.linhas.length - 1); setEdicoes({}); }}
                title="Volta ao corte e ao texto que a transcrição entregou"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restaurar tudo
              </button>
              {Object.keys(edicoes).length > 0 && (
                <span className="text-xs text-blue-700 font-semibold">
                  {Object.keys(edicoes).length} fala(s) corrigida(s)
                </span>
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
                <p className="font-bold text-gray-900">{c.titulo}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {video?.titulo}
                  {' · '}
                  {formatarDuracao(duracaoCriativo(c))}
                  {' · '}
                  {linhasEmUso(c).length} falas
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
