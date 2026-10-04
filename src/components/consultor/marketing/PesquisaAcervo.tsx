import React, { useState } from 'react';
import { ExternalLink, Loader2, Search, TrendingUp } from 'lucide-react';
import { auth } from '../../../lib/firebase';

type Fonte = { titulo: string; url: string };
type Mercado = { idioma: string; resumo: string };
type VideoRankeado = {
  videoId: string;
  titulo: string;
  pontuacao: number;
  mercados: string[];
  motivo: string;
  gancho: string;
};
type ResultadoPesquisa = {
  totalVideos: number;
  pesquisadoEm: string;
  mercados: Mercado[];
  ranking: VideoRankeado[];
  fontes: Fonte[];
};

export function PainelPesquisaAcervo() {
  const [pesquisando, setPesquisando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState<ResultadoPesquisa | null>(null);

  async function pesquisar() {
    setPesquisando(true);
    setErro('');
    setResultado(null);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const resposta = await fetch('/api/marketing-consultor/pesquisar-acervo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({}),
      });
      const corpo = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(corpo.error || 'HTTP ' + resposta.status);
      setResultado(corpo as ResultadoPesquisa);
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setPesquisando(false);
    }
  }

  return (
    <section className="pt-6 mt-8 border-t border-gray-200">
      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-blue-700" />
        Pesquisa de criativos no meu acervo
      </h3>
      <p className="text-sm text-gray-600 mt-1 mb-3 max-w-3xl">
        Cruza os títulos cadastrados em Meus vídeos com sinais atuais encontrados na web em português do Brasil, inglês e espanhol. Mostra os 10 vídeos com maior potencial de interesse e explica por quê.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={pesquisar}
          disabled={pesquisando}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 disabled:cursor-wait"
        >
          {pesquisando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Pesquisando tendências...</>
            : <><Search className="w-4 h-4" /> Pesquisar meus vídeos</>}
        </button>
        <span className="text-xs text-gray-500">
          Envia somente títulos, cursos e séries. A pesquisa roda quando você clicar.
        </span>
      </div>
      {pesquisando && (
        <p className="mt-3 text-sm text-blue-800" role="status">
          Comparando os títulos com fontes atuais. Isso pode levar até um minuto.
        </p>
      )}
      {erro && <p className="mt-3 text-sm text-red-700">{erro}</p>}
      {resultado && (
        <div className="mt-5 space-y-5">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950">
            Analisados {resultado.totalVideos} vídeos em {resultado.pesquisadoEm}. A pontuação indica aderência entre os temas do seu acervo e os sinais encontrados; não é uma previsão de visualizações.
          </div>
          {resultado.mercados?.length > 0 && (
            <div className="grid gap-2 md:grid-cols-3">
              {resultado.mercados.map((m) => (
                <div key={m.idioma} className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{m.idioma}</p>
                  <p className="mt-1 text-sm text-gray-700">{m.resumo}</p>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {resultado.ranking.map((video, index) => (
              <article key={video.videoId} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{index + 1}</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-900">{video.titulo}</h4>
                      <p className="mt-1 text-sm text-gray-600">{video.motivo}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">Aderência {video.pontuacao}/100</span>
                </div>
                {video.gancho && <p className="ml-10 mt-2 text-sm text-gray-700"><strong>Ângulo para testar:</strong> {video.gancho}</p>}
                {video.mercados?.length > 0 && (
                  <div className="ml-10 mt-2 flex flex-wrap gap-1.5">
                    {video.mercados.map((mercado) => <span key={mercado} className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{mercado}</span>)}
                  </div>
                )}
              </article>
            ))}
          </div>
          {resultado.fontes?.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Fontes consultadas</p>
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
