/**
 * Etapa 4 — Criativos aprovados.
 *
 * Aqui o criativo aprovado vira peça. A fala não se edita mais nesta tela: quem quiser
 * mudar o que foi dito volta pro criativo na etapa 3 e tira a aprovação. O que se edita
 * aqui é OUTRA coisa — o texto das páginas, que a IA escreveu A PARTIR da fala.
 *
 * UM roteiro serve os quatro formatos. O renderizador entrega o carrossel do feed, o
 * PDF do LinkedIn e o vídeo 9:16 numa execução só, a partir das mesmas páginas — gerar
 * um roteiro por formato custaria quatro vezes mais e deixaria o carrossel dizendo uma
 * coisa e o PDF outra, já que a IA não é determinística.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  Sparkles, Loader2, RotateCcw, Clock, FileText, Layers, Film, Image as ImageIcon,
  RefreshCw, Undo2,
} from 'lucide-react';
import { auth, db } from '../../../lib/firebase';
import {
  COLECOES, Criativo, Peca, SlideRoteiro, VideoFonte, FORMATOS,
  duracaoCriativo, inicioNoVideo, fimNoVideo, textoCriativo,
} from '../../../types/marketing';
import { Previa } from './EtapasPreenchidas';

const ICONE_FORMATO: Record<string, React.ReactNode> = {
  carrossel: <Layers className="w-4 h-4" />,
  video: <Film className="w-4 h-4" />,
  pdf: <FileText className="w-4 h-4" />,
  imagem: <ImageIcon className="w-4 h-4" />,
};

export function EtapaCriativosAprovados({
  criativos, videos, pecas, onMudou,
}: {
  criativos: Criativo[];
  videos: VideoFonte[];
  pecas: Peca[];
  onMudou: () => void;
}) {
  const aprovados = useMemo(
    () => criativos.filter((c) => c.status === 'aprovado')
      .sort((a, b) => a.videoId.localeCompare(b.videoId) || a.ordem - b.ordem),
    [criativos],
  );
  const [escolhido, setEscolhido] = useState('');

  useEffect(() => {
    if (!escolhido && aprovados.length) setEscolhido(aprovados[0].id);
  }, [aprovados, escolhido]);

  if (!aprovados.length) {
    return (
      <p className="text-sm text-gray-500 italic p-4 rounded-lg bg-gray-50 border border-dashed border-gray-300">
        Nenhum criativo aprovado ainda. Aprove na etapa 3 e ele aparece aqui.
      </p>
    );
  }

  const criativo = aprovados.find((c) => c.id === escolhido) || aprovados[0];
  const video = videos.find((v) => v.id === criativo.videoId);

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-bold text-gray-700 block mb-1.5">
          Criativo aprovado ({aprovados.length})
        </label>
        <select
          value={criativo.id}
          onChange={(e) => setEscolhido(e.target.value)}
          className="w-full max-w-2xl px-3 py-2 rounded-lg border border-gray-300 text-sm"
        >
          {aprovados.map((c) => {
            const v = videos.find((x) => x.id === c.videoId);
            return (
              <option key={c.id} value={c.id}>
                {formatar(inicioNoVideo(c))}–{formatar(fimNoVideo(c))} · {c.titulo}
                {v ? ` — ${v.titulo}` : ''}
              </option>
            );
          })}
        </select>
      </div>

      <FalaAprovada criativo={criativo} video={video} onMudou={onMudou} />
      <Producao criativo={criativo} video={video} pecas={pecas} onMudou={onMudou} />
    </div>
  );
}

/* ====================== A fala, só leitura ====================== */

function FalaAprovada({
  criativo, video, onMudou,
}: {
  criativo: Criativo;
  video?: VideoFonte;
  onMudou: () => void;
}) {
  const [devolvendo, setDevolvendo] = useState(false);

  async function devolver() {
    setDevolvendo(true);
    try {
      await updateDoc(doc(db, COLECOES.criativos, criativo.id), {
        status: 'revisar',
        atualizadoEm: new Date().toISOString(),
      });
      onMudou();
    } finally {
      setDevolvendo(false);
    }
  }

  return (
    <section className="p-4 rounded-lg border border-green-200 bg-green-50/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
            <Clock className="w-4 h-4 text-gray-400" />
            {formatar(inicioNoVideo(criativo))} – {formatar(fimNoVideo(criativo))}
            <span className="font-normal text-gray-500">
              · {formatar(duracaoCriativo(criativo))} de vídeo
            </span>
          </p>
          <p className="text-xs text-gray-600 mt-0.5">{video?.titulo}</p>
        </div>
        {/* Mudar a fala aqui abriria um segundo lugar de edição, e o texto aprovado
            deixaria de ser um só. Quem quer mexer volta pra etapa 3. */}
        <button
          onClick={devolver}
          disabled={devolvendo}
          title="Tira a aprovação e devolve o criativo para a etapa 3, onde se edita a fala"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60 shrink-0"
        >
          {devolvendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
          Editar a fala
        </button>
      </div>
      <p className="text-sm text-gray-700 mt-2 leading-relaxed">{textoCriativo(criativo)}</p>
    </section>
  );
}

/* ====================== Gerar e revisar as peças ====================== */

function Producao({
  criativo, video, pecas, onMudou,
}: {
  criativo: Criativo;
  video?: VideoFonte;
  pecas: Peca[];
  onMudou: () => void;
}) {
  const [gerando, setGerando] = useState(false);
  const [enfileirando, setEnfileirando] = useState(false);
  const [erro, setErro] = useState('');
  const [slides, setSlides] = useState<SlideRoteiro[]>(criativo.roteiro?.slides || []);
  const [melhoria, setMelhoria] = useState('');

  // Trocar de criativo no dropdown tem que trocar o roteiro na tela junto.
  useEffect(() => {
    setSlides(criativo.roteiro?.slides || []);
    setErro('');
    setMelhoria('');
  }, [criativo.id, criativo.roteiro?.geradoEm]);

  const campanhaId = `${criativo.id}__pecas`;
  const daCampanha = pecas.filter((p) => p.campanhaId === campanhaId);

  async function gerarRoteiro() {
    setGerando(true);
    setErro('');
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';
      const r = await fetch('/api/marketing-consultor/gerar-roteiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ criativoId: criativo.id, melhoria: melhoria.trim() || undefined }),
      });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(corpo.error || `HTTP ${r.status}`);
      setSlides(corpo.slides || []);
      setMelhoria('');
      onMudou();
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setGerando(false);
    }
  }

  /** Manda o roteiro (o que está na tela, com as suas edições) para a fila de produção. */
  async function produzir() {
    if (slides.length < 6 || slides.length > 8) {
      setErro(`O carrossel precisa de 6 a 8 páginas. O roteiro tem ${slides.length}.`);
      return;
    }
    setEnfileirando(true);
    setErro('');
    try {
      const agora = new Date().toISOString();
      await setDoc(doc(db, COLECOES.campanhas, campanhaId), {
        id: campanhaId,
        consultorId: criativo.consultorId,
        videoId: criativo.videoId,
        criativoId: criativo.id,
        titulo: criativo.titulo,
        objetivo: 'autoridade',
        status: 'processando',
        corteInicio: formatar(inicioNoVideo(criativo)),
        corteFim: formatar(fimNoVideo(criativo)),
        criadoEm: agora,
      }, { merge: true });

      // O que está na tela é o que vai. Se o consultor editou o texto, é o texto
      // dele que vira imagem — a IA não é consultada de novo.
      await addDoc(collection(db, COLECOES.tarefas), {
        consultorId: criativo.consultorId,
        campanhaId,
        tipo: 'gerar-campanha',
        status: 'pendente',
        tentativas: 0,
        render: {
          date: agora.slice(0, 10),
          slug: criativo.id.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60),
          folderType: 'Carrossel',
          sequence: Math.min(99, Math.max(1, criativo.ordem || 1)),
          video: { enabled: true, secondsPerSlide: 5 },
          signature: assinatura(video),
          slides,
        },
        criadoEm: agora,
        criadoEmServidor: serverTimestamp(),
      });
      onMudou();
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setEnfileirando(false);
    }
  }

  function alterarSlide(i: number, campo: keyof SlideRoteiro, valor: string) {
    setSlides((atual) => atual.map((s, j) => (j === i ? { ...s, [campo]: valor } : s)));
  }

  if (!slides.length) {
    return (
      <section className="p-4 rounded-lg border border-gray-200 bg-white">
        <p className="text-sm text-gray-600 mb-3">
          As quatro peças saem de um texto só, escrito a partir desta fala. Gere, revise
          o texto e mande produzir.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {FORMATOS.map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 text-xs font-semibold text-gray-700">
              {ICONE_FORMATO[f.id]} {f.nome}
              <span className="font-normal text-gray-500">· {f.onde}</span>
            </span>
          ))}
        </div>
        <button
          onClick={gerarRoteiro}
          disabled={gerando}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
        >
          {gerando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Escrevendo as páginas…</>
            : <><Sparkles className="w-4 h-4" /> Gerar as peças</>}
        </button>
        {erro && <p className="text-sm text-red-700 mt-3">{erro}</p>}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="p-4 rounded-lg border border-gray-200 bg-white">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h4 className="font-bold text-gray-900">O texto das páginas</h4>
            <p className="text-xs text-gray-600 mt-0.5">
              Escrito a partir da fala. Edite à vontade — o que estiver aqui é o que vira
              imagem, em todos os formatos.
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-500 shrink-0">
            {slides.length} páginas
          </span>
        </div>

        <div className="space-y-2">
          {slides.map((s, i) => (
            <div key={i} className="p-2.5 rounded border border-gray-200">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-gray-400">{i + 1}</span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                  {s.type}
                </span>
                <ContadorPalavras slide={s} />
              </div>
              <input
                value={s.title}
                onChange={(e) => alterarSlide(i, 'title', e.target.value)}
                placeholder="Título"
                className="w-full px-2 py-1 rounded border border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none font-bold text-gray-900 text-sm"
              />
              <textarea
                value={s.body}
                onChange={(e) => alterarSlide(i, 'body', e.target.value)}
                rows={2}
                placeholder="Texto"
                className="w-full px-2 py-1 mt-1 rounded border border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none text-sm text-gray-700 resize-none"
              />
              {(['sub', 'numero', 'fonte', 'negativo', 'positivo', 'palavra'] as const).map((campo) => (
                s[campo] !== undefined && (
                  <div key={campo} className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold uppercase text-gray-400 w-16 shrink-0">{campo}</span>
                    <input
                      value={s[campo] || ''}
                      onChange={(e) => alterarSlide(i, campo, e.target.value)}
                      className="flex-1 px-2 py-0.5 rounded border border-gray-200 text-xs text-gray-700"
                    />
                  </div>
                )
              ))}
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Use *asteriscos* para destacar em azul. Cada página aceita no máximo 32 palavras
          entre título e texto — acima disso a peça não é gerada.
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={produzir}
            disabled={enfileirando}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {enfileirando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Mandando produzir…</>
              : <>{daCampanha.length ? 'Produzir de novo com este texto' : 'Produzir as peças'}</>}
          </button>
          <button
            onClick={() => setSlides(criativo.roteiro?.slides || [])}
            title="Volta ao texto que a IA escreveu"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Desfazer minhas edições
          </button>
        </div>
        {erro && <p className="text-sm text-red-700 mt-2">{erro}</p>}
      </section>

      {/* Pedir outra versão à IA: o texto some e é reescrito, então fica separado
          do botão de produzir, pra ninguém clicar sem querer e perder o que editou. */}
      <section className="p-4 rounded-lg border border-gray-200 bg-gray-50">
        <h4 className="font-bold text-gray-900 text-sm">Não gostou? Peça outra versão</h4>
        <p className="text-xs text-gray-600 mt-0.5 mb-2">
          Diga o que mudar e a IA reescreve as páginas. <strong>Isso substitui o texto
          acima</strong>, inclusive as suas edições.
        </p>
        <textarea
          value={melhoria}
          onChange={(e) => setMelhoria(e.target.value)}
          rows={2}
          placeholder="Ex.: a capa está fraca, comece pelo incômodo de quem nunca liderou um projeto"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
        />
        <button
          onClick={gerarRoteiro}
          disabled={gerando}
          className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg border border-blue-300 bg-white text-blue-700 text-sm font-semibold hover:bg-blue-50 disabled:opacity-60"
        >
          {gerando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Reescrevendo…</>
            : <><RefreshCw className="w-3.5 h-3.5" /> Reescrever as páginas</>}
        </button>
      </section>

      <PecasProduzidas pecas={daCampanha} />
    </div>
  );
}

/* ====================== O que saiu ====================== */

function PecasProduzidas({ pecas }: { pecas: Peca[] }) {
  if (!pecas.length) {
    return (
      <p className="text-sm text-gray-500 italic p-4 rounded-lg bg-gray-50 border border-dashed border-gray-300">
        Nenhuma peça produzida ainda. Clique em “Produzir as peças” e elas aparecem aqui
        quando ficarem prontas — pode levar um minuto.
      </p>
    );
  }

  return (
    <section className="p-4 rounded-lg border border-gray-200 bg-white">
      <h4 className="font-bold text-gray-900 mb-3">O que foi produzido</h4>
      <div className="space-y-4">
        {pecas.map((p) => (
          <div key={p.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              {nomeDaPeca(p.tipo)}
              {p.versao > 1 && (
                <span className="text-xs font-normal text-gray-500">versão {p.versao}</span>
              )}
            </p>
            <Previa caminho={p.arquivoUrl} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ====================== Auxiliares ====================== */

/** O renderizador recusa a página acima de 32 palavras, então o aviso é na hora da edição. */
function ContadorPalavras({ slide }: { slide: SlideRoteiro }) {
  const n = `${slide.title || ''} ${slide.body || ''}`
    .replace(/\*/g, '').trim().split(/\s+/).filter(Boolean).length;
  return (
    <span className={`text-[10px] font-bold ${n > 32 ? 'text-red-600' : 'text-gray-400'}`}>
      {n}/32 palavras
    </span>
  );
}

function nomeDaPeca(tipo: Peca['tipo']) {
  if (tipo === 'carrossel-feed') return 'Carrossel do feed';
  if (tipo === 'carrossel-video') return 'Carrossel em vídeo';
  if (tipo === 'linkedin-pdf') return 'Documento PDF';
  return 'Reel';
}

function assinatura(video?: VideoFonte) {
  const curto = (t: string) => (t.length > 30 ? `${t.slice(0, 29).trimEnd()}…` : t);
  const linhas: string[] = [];
  if (video?.curso) linhas.push(curto(`FONTE: curso ${video.curso}`));
  if (video?.serie) linhas.push(curto(video.serie.toUpperCase()));
  else if (video?.titulo) linhas.push(curto(video.titulo.toUpperCase()));
  return linhas.length ? linhas : ['LBW'];
}

function formatar(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = Math.round(segundos % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
