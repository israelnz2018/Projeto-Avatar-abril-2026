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
  Sparkles, Loader2, RotateCcw, Clock, RefreshCw, Undo2,
} from 'lucide-react';
import { auth, db } from '../../../lib/firebase';
import {
  COLECOES, Campanha, Criativo, Peca, SlideRoteiro, VideoFonte,
  duracaoCriativo, inicioNoVideo, fimNoVideo, textoCriativo,
} from '../../../types/marketing';
import { Previa } from './EtapasPreenchidas';


export function EtapaCriativosAprovados({
  criativos, videos, pecas, campanhas = [], onMudou,
}: {
  criativos: Criativo[];
  videos: VideoFonte[];
  pecas: Peca[];
  /** Só para saber se o servidor ainda está trabalhando nesta peça. */
  campanhas?: Campanha[];
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
      <Producao criativo={criativo} video={video} pecas={pecas} campanhas={campanhas} onMudou={onMudou} />
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
  criativo, video, pecas, campanhas, onMudou,
}: {
  criativo: Criativo;
  video?: VideoFonte;
  pecas: Peca[];
  campanhas: Campanha[];
  onMudou: () => void;
}) {
  const [gerando, setGerando] = useState(false);
  const [enfileirando, setEnfileirando] = useState(false);
  const [erro, setErro] = useState('');
  const [slides, setSlides] = useState<SlideRoteiro[]>(criativo.roteiro?.slides || []);
  const [melhoria, setMelhoria] = useState('');
  const [avisoReel, setAvisoReel] = useState('');

  // Trocar de criativo no dropdown tem que trocar o roteiro na tela junto.
  useEffect(() => {
    setSlides(criativo.roteiro?.slides || []);
    setErro('');
    setMelhoria('');
  }, [criativo.id, criativo.roteiro?.geradoEm]);

  const campanhaId = `${criativo.id}__pecas`;
  const campanhaReel = `${criativo.id}__reel`;
  // As quatro peças numa lista só: o Reel falado e as três que saem do roteiro.
  const minhasPecas = pecas.filter((p) => p.campanhaId === campanhaId || p.campanhaId === campanhaReel);
  const daCampanha = minhasPecas;
  const podeCortar = Boolean(video?.bunnyVideoId);

  // QUEM SABE se ainda está trabalhando é o BANCO, não o navegador.
  //
  // Antes isso vinha do estado local de quem clicou, que vira falso assim que a
  // tarefa ENTRA NA FILA — não quando termina. Nos ~60 segundos seguintes a tela
  // dizia "nenhuma peça ainda", como se o clique não tivesse feito nada, enquanto
  // o worker produzia normalmente. O trabalho é do servidor, então o estado dele
  // também.
  const servidorTrabalhando = campanhas.some(
    (c) => (c.id === campanhaId || c.id === campanhaReel) && c.status === 'processando',
  );

  /** Pede as páginas à IA e devolve o que veio. Não produz nada. */
  async function pedirRoteiro(): Promise<SlideRoteiro[]> {
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
      const novos: SlideRoteiro[] = corpo.slides || [];
      setSlides(novos);
      setMelhoria('');
      onMudou();
      return novos;
    } catch (e: any) {
      setErro(e?.message || String(e));
      return [];
    }
  }

  /** Manda para a fila de produção o texto que foi passado. */
  async function produzirCom(paginas: SlideRoteiro[]) {
    if (paginas.length < 6 || paginas.length > 8) {
      setErro(`O carrossel precisa de 6 a 8 páginas. O texto tem ${paginas.length}.`);
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
          slides: paginas,
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

  /**
   * Escrever o texto e produzir viraram UM clique.
   *
   * Estavam separados, e o consultor tinha que passar por um formulário de seis
   * páginas antes de ver qualquer coisa. Ele quer ver a peça pronta e julgar a
   * peça — não aprovar um texto intermediário. Ajustar o texto continua possível,
   * mas depois, e só para quem quiser.
   */
  /** Põe o Reel falado na fila. Não passa pela IA: o texto é a própria fala. */
  async function pedirReel() {
    if (!podeCortar) return;
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : '';
    const r = await fetch('/api/marketing-consultor/gerar-reel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ criativoId: criativo.id }),
    });
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      // Falha no Reel não derruba o carrossel: são peças independentes, e perder as
      // três porque uma não deu seria pior do que entregar três.
      setAvisoReel(corpo.error || `Não foi possível cortar o Reel (HTTP ${r.status}).`);
    }
  }

  /**
   * UM clique, as quatro peças.
   *
   * Eram dois botões — um pro Reel, outro pro carrossel — e o consultor pediu um só.
   * As duas coisas são independentes: o corte do vídeo entra na fila enquanto a IA
   * ainda está escrevendo as páginas.
   */
  async function criarTudo() {
    setGerando(true);
    setErro('');
    setAvisoReel('');
    try {
      const reel = pedirReel();
      const novos = await pedirRoteiro();
      if (novos.length) await produzirCom(novos);
      await reel;
      onMudou();
    } finally {
      setGerando(false);
    }
  }


  // Ainda não começou nada: um botão só, e o que ele vai produzir dito de saída.
  //
  // A condição olha PEÇA e TRABALHO EM CURSO, não o roteiro. Olhando o roteiro, a
  // tela trocava de modo no instante em que a IA terminava de escrever: o botão
  // sumia e no lugar aparecia "nenhuma peça ainda", com o worker ainda produzindo.
  // Para quem clicou, parecia que o clique não tinha feito nada.
  if (!daCampanha.length && !servidorTrabalhando && !gerando && !enfileirando) {
    return (
      <section className="p-5 rounded-lg border border-gray-200 bg-white">
        <p className="text-sm text-gray-700 mb-1 font-semibold">Deste trecho saem quatro peças:</p>
        <ul className="text-sm text-gray-600 mb-4 space-y-0.5">
          <li>• <strong>Reel com você falando</strong>, com legenda acompanhando a fala</li>
          <li>• Carrossel para o feed</li>
          <li>• Documento PDF para o LinkedIn</li>
          <li>• Carrossel em vídeo, para os Reels</li>
        </ul>
        <button
          onClick={criarTudo}
          disabled={gerando || enfileirando}
          className="flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
        >
          {gerando || enfileirando
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Criando tudo…</>
            : <><Sparkles className="w-5 h-5" /> Criar tudo</>}
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Leva cerca de um minuto. Pode fechar a tela — o trabalho continua no servidor.
        </p>
        {!podeCortar && (
          <p className="text-xs text-amber-800 mt-2">
            Este vídeo veio de link externo, então o Reel falado não sai — só as três
            peças de texto. Para ter o Reel, envie o arquivo pela etapa 3.
          </p>
        )}
        {erro && <p className="text-sm text-red-700 mt-3">{erro}</p>}
        {avisoReel && <p className="text-sm text-amber-800 mt-3">{avisoReel}</p>}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {/* AS PEÇAS PRIMEIRO. O consultor quer julgar o que saiu, não aprovar um
          texto intermediário — o texto fica embaixo, fechado, pra quem quiser. */}
      <PecasProduzidas
        pecas={daCampanha}
        esperando={servidorTrabalhando || gerando || enfileirando}
      />

      <details className="rounded-lg border border-gray-200 bg-white">
        <summary className="px-4 py-3 text-sm font-semibold text-gray-700 cursor-pointer">
          Quero mudar o texto das peças
        </summary>
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-600 mb-3">
            Este é o texto do carrossel, do PDF e do vídeo de slides. O Reel com você falando
            não usa este texto — ele usa a sua própria fala. Mude o que quiser e mande refazer.
            Use *asteriscos* para destacar em azul; cada página aceita no máximo 32 palavras.
          </p>

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

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button
              onClick={() => produzirCom(slides)}
              disabled={enfileirando}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {enfileirando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Refazendo…</>
                : <>Refazer as peças com este texto</>}
            </button>
            <button
              onClick={() => setSlides(criativo.roteiro?.slides || [])}
              title="Volta ao texto que a IA escreveu"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Desfazer minhas edições
            </button>
          </div>

          {/* Pedir outra versão à IA SUBSTITUI o texto, inclusive o que foi editado.
              Por isso fica no fim, separado do botão que só refaz as peças. */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-600 mb-1.5">
              Ou diga o que mudar e a IA reescreve tudo do zero:
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={melhoria}
                onChange={(e) => setMelhoria(e.target.value)}
                placeholder="Ex.: a capa está fraca, comece pelo incômodo de quem nunca liderou um projeto"
                className="flex-1 min-w-[260px] px-3 py-2 rounded-lg border border-gray-300 text-sm"
              />
              <button
                onClick={criarTudo}
                disabled={gerando || enfileirando}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-300 bg-white text-blue-700 text-sm font-semibold hover:bg-blue-50 disabled:opacity-60"
              >
                {gerando
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Reescrevendo…</>
                  : <><RefreshCw className="w-3.5 h-3.5" /> Reescrever e refazer</>}
              </button>
            </div>
          </div>

          {erro && <p className="text-sm text-red-700 mt-2">{erro}</p>}
        </div>
      </details>
    </div>
  );
}

/* ====================== O que saiu ====================== */

function PecasProduzidas({ pecas, esperando }: { pecas: Peca[]; esperando?: boolean }) {
  // Enquanto o servidor trabalha, a tela tem que dizer que está trabalhando. Antes
  // ficava escrito "nenhuma peça produzida", que parece falha e não espera.
  if (esperando && !pecas.length) {
    return (
      <section className="p-6 rounded-lg border border-blue-200 bg-blue-50/40 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
        <p className="text-sm font-semibold text-blue-900 mt-2">Criando as suas peças…</p>
        <p className="text-xs text-blue-800 mt-1">
          Cerca de um minuto. Pode fechar a tela — o trabalho continua no servidor.
        </p>
      </section>
    );
  }

  if (!pecas.length) {
    return (
      <p className="text-sm text-gray-500 italic p-4 rounded-lg bg-gray-50 border border-dashed border-gray-300">
        Nenhuma peça ainda.
      </p>
    );
  }

  return (
    <section className="p-4 rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="font-bold text-gray-900">As suas peças</h4>
        {esperando && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> refazendo…
          </span>
        )}
      </div>
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
