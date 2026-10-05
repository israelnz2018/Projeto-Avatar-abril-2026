import React, { useState } from 'react';
import { ExternalLink, Loader2, Plus, RefreshCw, Search, TrendingUp } from 'lucide-react';
import { auth } from '../../../lib/firebase';

type Fonte = { titulo: string; url: string };
type Mercado = { idioma: string; resumo: string };
type Termo = { consulta: string; mercado: 'BR' | 'EN' | 'ES'; sinal: string };
type VideoRankeado = {
  videoId: string;
  knowledgeBaseId?: string;
  titulo: string;
  curso: string;
  serie: string;
  pontuacao: number;
  correspondencia: 'alta' | 'media';
  termos: Termo[];
  motivo: string;
  trecho?: { time: string; topic: string };
  base: 'topicos' | 'titulo' | 'serie';
  origem: 'curso' | 'meus-videos';
};
type SinalYoutube = {
  consulta: string;
  mercado: Termo['mercado'];
  videos: { titulo: string; url: string; visualizacoes: number; publicadoEm: string }[];
};
type ResultadoPesquisa = {
  totalVideos: number;
  pesquisadoEm: string;
  mercados: Mercado[];
  termos: Termo[];
  ranking: VideoRankeado[];
  fontes: Fonte[];
  youtube: { status: string; sinais: SinalYoutube[] };
  aviso?: string;
  metodologia?: string;
  cache?: boolean;
};

function nomeMercado(codigo: Termo['mercado']) {
  return codigo === 'BR' ? 'Brasil' : codigo === 'EN' ? 'Inglês' : 'Espanhol';
}

function linkTrends(termo: Termo) {
  const pais = termo.mercado === 'BR' ? 'BR' : termo.mercado === 'EN' ? 'US' : 'ES';
  return 'https://trends.google.com/trends/explore?geo=' + pais + '&q=' + encodeURIComponent(termo.consulta);
}

function linkBuscaYoutube(termo: Termo) {
  return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(termo.consulta);
}

export function PainelPesquisaAcervo({ consultorId, onMudou }: { consultorId: string; onMudou?: () => void }) {
  const cacheLocal = 'lbw-pesquisa-acervo:' + consultorId;
  const [pesquisando, setPesquisando] = useState(false);
  const [adicionando, setAdicionando] = useState('');
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState<ResultadoPesquisa | null>(() => {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(sessionStorage.getItem(cacheLocal) || 'null'); }
    catch { return null; }
  });

  async function pesquisar() {
    setPesquisando(true);
    setErro('');
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const resposta = await fetch('/api/marketing-consultor/pesquisar-acervo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ atualizar: Boolean(resultado) }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(corpo.error || 'HTTP ' + resposta.status);
      const novo = corpo as ResultadoPesquisa;
      setResultado(novo);
      try { sessionStorage.setItem(cacheLocal, JSON.stringify(novo)); }
      catch { /* A pesquisa continua visível mesmo se o navegador não permitir armazenamento. */ }
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setPesquisando(false);
    }
  }

  async function adicionarAosVideos(video: VideoRankeado) {
    if (!video.knowledgeBaseId) return;
    setAdicionando(video.videoId);
    setErro('');
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const resposta = await fetch('/api/marketing-consultor/usar-video-do-curso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ knowledgeBaseId: video.knowledgeBaseId }),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(corpo.error || 'HTTP ' + resposta.status);
      setResultado((atual) => {
        if (!atual) return atual;
        const atualizado = {
          ...atual,
          ranking: atual.ranking.map((v) => v.videoId === video.videoId ? { ...v, origem: 'meus-videos' as const } : v),
        };
        try { sessionStorage.setItem(cacheLocal, JSON.stringify(atualizado)); }
        catch { /* Segue na tela. */ }
        return atualizado;
      });
      onMudou?.();
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setAdicionando('');
    }
  }

  return (
    <section className="pt-6 border-t border-gray-200">
      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-blue-700" />
        Pesquisa de temas no meu acervo
      </h3>
      <p className="text-sm text-gray-600 mt-1 mb-3 max-w-3xl">
        Compara perguntas encontradas na pesquisa da web com os títulos e tópicos das suas aulas. Inclui aulas dos cursos que ainda não estão em Meus vídeos e mostra o trecho relacionado quando há um índice da aula.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={pesquisar}
          disabled={pesquisando}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 disabled:cursor-wait"
        >
          {pesquisando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Pesquisando...</>
            : resultado
              ? <><RefreshCw className="w-4 h-4" /> Atualizar pesquisa</>
              : <><Search className="w-4 h-4" /> Pesquisar meus vídeos</>}
        </button>
        <span className="text-xs text-gray-500 max-w-lg">
          A busca externa recebe uma amostra de títulos, cursos e séries. Os tópicos do índice são comparados dentro da plataforma; nenhuma transcrição é enviada.
        </span>
      </div>
      {pesquisando && <p className="mt-3 text-sm text-blue-800" role="status">Lendo o acervo e pesquisando fontes atuais. Isso pode levar alguns minutos.</p>}
      {erro && <p className="mt-3 text-sm text-red-700" role="alert">{erro}</p>}
      {resultado && (
        <div className="mt-5 space-y-5">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950">
            {resultado.totalVideos} aulas e vídeos considerados. Pesquisa de {new Date(resultado.pesquisadoEm).toLocaleString('pt-BR')}.
            {resultado.cache && ' Resultado recente reutilizado.'}
            <p className="mt-1">{resultado.metodologia}</p>
          </div>
          {resultado.aviso && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{resultado.aviso}</p>}
          {resultado.mercados?.length > 0 && (
            <div className="grid gap-2 md:grid-cols-3">
              {resultado.mercados.map((mercado) => (
                <div key={mercado.idioma} className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{mercado.idioma}</p>
                  <p className="mt-1 text-sm text-gray-700">{mercado.resumo}</p>
                </div>
              ))}
            </div>
          )}
          {resultado.ranking?.length > 0 && (
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Aulas que correspondem aos temas pesquisados</h4>
              <div className="space-y-2">
                {resultado.ranking.map((video, index) => (
                  <article key={video.videoId} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{index + 1}</span>
                        <div className="min-w-0">
                          <h5 className="font-bold text-gray-900">{video.titulo}</h5>
                          <p className="mt-0.5 text-xs text-gray-500">{[video.curso, video.serie].filter(Boolean).join(' · ')}</p>
                          <p className="mt-1 text-sm text-gray-700">{video.motivo}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                        Correspondência {video.correspondencia === 'alta' ? 'alta' : 'moderada'}
                      </span>
                    </div>
                    {video.trecho?.topic && (
                      <p className="ml-10 mt-2 text-sm text-gray-700">
                        <strong>Trecho da aula{video.trecho.time ? ' · ' + video.trecho.time : ''}:</strong> {video.trecho.topic}
                      </p>
                    )}
                    <div className="ml-10 mt-2 flex flex-wrap gap-1.5">
                      {video.termos?.map((termo) => (
                        <span key={termo.mercado + termo.consulta} className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                          {nomeMercado(termo.mercado)} · {termo.consulta}
                        </span>
                      ))}
                    </div>
                    {video.origem === 'curso' && video.knowledgeBaseId && (
                      <button
                        type="button"
                        onClick={() => adicionarAosVideos(video)}
                        disabled={Boolean(adicionando)}
                        className="ml-10 mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline disabled:opacity-60"
                      >
                        {adicionando === video.videoId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Adicionar aos Meus vídeos
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}
          {resultado.termos?.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="font-bold text-gray-900">Perguntas investigadas</h4>
              <p className="mt-1 mb-3 text-xs text-gray-500">São hipóteses de perguntas para conferir nas fontes, no Google Trends e no YouTube. Esta lista não informa quantas pessoas pesquisaram cada termo.</p>
              <ul className="space-y-2">
                {resultado.termos.map((termo) => (
                  <li key={termo.mercado + termo.consulta} className="border-t border-gray-100 pt-2 text-sm">
                    <span className="font-semibold text-gray-900">{termo.consulta}</span>
                    <span className="ml-2 text-xs text-gray-500">{nomeMercado(termo.mercado)}</span>
                    {termo.sinal && <p className="text-gray-600 mt-0.5">{termo.sinal}</p>}
                    <div className="mt-1 flex flex-wrap gap-4">
                      <a href={linkTrends(termo)} target="_blank" rel="noreferrer" className="text-xs text-blue-700 hover:underline inline-flex items-center gap-1">
                        Conferir no Google Trends <ExternalLink className="w-3 h-3" />
                      </a>
                      <a href={linkBuscaYoutube(termo)} target="_blank" rel="noreferrer" className="text-xs text-blue-700 hover:underline inline-flex items-center gap-1">
                        Ver busca no YouTube <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h4 className="font-bold text-gray-900">Busca direta no YouTube</h4>
            {resultado.youtube?.status === 'disponivel' ? (
              <div className="mt-2 space-y-3">
                <p className="text-xs text-gray-600">Exemplos publicados nos últimos 12 meses para consultas no Brasil, em inglês e em espanhol. Visualizações desses vídeos não equivalem ao volume de buscas.</p>
                {resultado.youtube.sinais.map((sinal) => (
                  <div key={sinal.mercado + sinal.consulta}>
                    <p className="text-sm font-semibold text-gray-800">{sinal.consulta} <span className="font-normal text-gray-500">· {nomeMercado(sinal.mercado)}</span></p>
                    <ul className="mt-1 space-y-1">
                      {sinal.videos.map((video) => (
                        <li key={video.url} className="text-xs text-gray-600">
                          <a href={video.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{video.titulo}</a>
                          {' · '}{video.visualizacoes.toLocaleString('pt-BR')} visualizações
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-600">
                {resultado.youtube?.status === 'indisponivel'
                  ? 'A conexão direta com a API do YouTube não respondeu nesta pesquisa.'
                  : 'A chave da YouTube Data API ainda não está configurada no servidor. A comparação com o acervo e as fontes da web já está disponível acima.'}
              </p>
            )}
          </div>
          {resultado.fontes?.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Fontes da pesquisa na web</p>
              <ul className="space-y-1.5">
                {resultado.fontes.map((fonte) => (
                  <li key={fonte.url}>
                    <a href={fonte.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">
                      {fonte.titulo || fonte.url}<ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
