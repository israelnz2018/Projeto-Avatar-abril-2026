/**
 * Etapa 4 — Minhas peças.
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
  Sparkles, Loader2, RotateCcw, Clock, RefreshCw, Undo2, Check, CheckCircle2,
} from 'lucide-react';
import { auth, db } from '../../../lib/firebase';
import {
  COLECOES, Campanha, Criativo, MarcaDaPeca, Peca, SlideRoteiro, VideoFonte,
  duracaoCriativo, inicioNoVideo, fimNoVideo, textoCriativo,
} from '../../../types/marketing';
import { Previa, Anexos } from './EtapasPreenchidas';

/**
 * Os layouts de página que o renderizador sabe montar.
 *
 * "camadas" existe no renderizador mas fica FORA desta lista: ele precisa de uma
 * estrutura de cartões aninhados que nem a IA escreve nem esta tela edita, e
 * escolher esse layout devolveria uma página vazia.
 */
const LAYOUTS: { id: SlideRoteiro['type']; nome: string; exige: (keyof SlideRoteiro)[] }[] = [
  { id: 'capa', nome: 'Capa — título grande e pergunta', exige: ['sub'] },
  { id: 'padrao', nome: 'Padrão — título e texto', exige: [] },
  { id: 'dado', nome: 'Dado — número gigante em destaque', exige: ['numero', 'fonte'] },
  { id: 'comparacao', nome: 'Comparação — antes e depois', exige: ['negativo', 'positivo'] },
  { id: 'cta', nome: 'Chamada — a palavra a comentar', exige: ['palavra'] },
];

/** Os layouts que têm espaço para uma pessoa. Comparação não tem. */
const LAYOUTS_COM_PESSOA = new Set<SlideRoteiro['type']>(['capa', 'padrao', 'dado', 'cta']);

/**
 * A biblioteca de pessoas recortadas, que vive junto do renderizador.
 *
 * A lista está escrita aqui porque a tela não enxerga a pasta de assets do motor.
 * Se entrar gente nova lá, entra aqui também — e o renderizador avisa no log
 * quando recebe um nome que não existe, em vez de quebrar.
 */
const PESSOAS: { id: string; nome: string }[] = [
  { id: '01-frustracao-mulher-30', nome: 'Frustração — mulher, 30' },
  { id: '02-decisao-mulher-30', nome: 'Decisão — mulher, 30' },
  { id: '03-duvida-homem-40', nome: 'Dúvida — homem, 40' },
  { id: '04-explicando-homem-40', nome: 'Explicando — homem, 40' },
  { id: '05-sobrecarga-homem-20', nome: 'Sobrecarga — homem, 20' },
  { id: '06-insight-homem-20', nome: 'Insight — homem, 20' },
  { id: '07-apontando-mulher-40', nome: 'Apontando — mulher, 40' },
  { id: '08-foco-mulher-40', nome: 'Foco — mulher, 40' },
  { id: '09-ceticismo-homem-50', nome: 'Ceticismo — homem, 50' },
  { id: '10-confusao-mulher-20', nome: 'Confusão — mulher, 20' },
  { id: '11-explicando-homem-30', nome: 'Explicando — homem, 30' },
  { id: '12-lideranca-mulher-30', nome: 'Liderança — mulher, 30' },
];

/** Os campos de texto que este layout precisa, somados aos que já têm conteúdo. */
function camposDoSlide(slide: SlideRoteiro): (keyof SlideRoteiro)[] {
  const doLayout = LAYOUTS.find((l) => l.id === slide.type)?.exige || [];
  const preenchidos = (['sub', 'numero', 'fonte', 'negativo', 'positivo', 'palavra'] as const)
    .filter((c) => slide[c] !== undefined);
  return [...new Set([...doLayout, ...preenchidos])];
}


export function EtapaCriativosAprovados({
  criativos, videos, pecas, campanhas = [], marca, onMudou,
}: {
  criativos: Criativo[];
  videos: VideoFonte[];
  pecas: Peca[];
  /** Só para saber se o servidor ainda está trabalhando nesta peça. */
  campanhas?: Campanha[];
  /** Nome, logo e cores do consultor, que vão no cabeçalho e na paleta da peça. */
  marca?: MarcaDaPeca;
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
      <Producao criativo={criativo} video={video} pecas={pecas} campanhas={campanhas} marca={marca} onMudou={onMudou} />
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
  criativo, video, pecas, campanhas, marca, onMudou,
}: {
  criativo: Criativo;
  video?: VideoFonte;
  pecas: Peca[];
  campanhas: Campanha[];
  marca?: MarcaDaPeca;
  onMudou: () => void;
}) {
  const [gerando, setGerando] = useState(false);
  const [enfileirando, setEnfileirando] = useState(false);
  const [erro, setErro] = useState('');
  const [slides, setSlides] = useState<SlideRoteiro[]>(criativo.roteiro?.slides || []);
  const [melhoria, setMelhoria] = useState('');
  const [avisoReel, setAvisoReel] = useState('');
  // Os dois vídeos têm ritmo próprio: o Reel falado acelera a fala, o carrossel em
  // vídeo escolhe quanto tempo cada página fica na tela.
  const [velocidade, setVelocidade] = useState(1);
  const [segundosPorSlide, setSegundosPorSlide] = useState(5);

  // Trocar de criativo no dropdown tem que trocar o roteiro na tela junto.
  useEffect(() => {
    setSlides(criativo.roteiro?.slides || []);
    setErro('');
    setMelhoria('');
  }, [criativo.id, criativo.roteiro?.geradoEm]);

  const campanhaId = `${criativo.id}__pecas`;
  const campanhaReel = `${criativo.id}__reel`;

  // O ritmo escolhido fica GRAVADO NA CAMPANHA, não só na aba aberta.
  //
  // Sem isso, sair do criativo e voltar traria 1x e 5s de volta; o consultor
  // clicaria "refazer" achando que estava só recarregando e receberia uma peça
  // diferente da que aprovou. Lê uma vez por criativo, de propósito: relê a cada
  // atualização e o seletor se mexeria sozinho enquanto ele escolhe.
  useEffect(() => {
    const reel = campanhas.find((c) => c.id === `${criativo.id}__reel`);
    const texto = campanhas.find((c) => c.id === `${criativo.id}__pecas`);
    setVelocidade(Number(reel?.velocidade) || 1);
    setSegundosPorSlide(Number(texto?.segundosPorSlide) || 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criativo.id]);
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
        segundosPorSlide,
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
          video: { enabled: true, secondsPerSlide: segundosPorSlide },
          // Sem marca, o renderizador cai no padrão LBW — que é o que ele fazia
          // antes de este campo existir.
          ...(marca ? { marca } : {}),
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

  function alterarSlide(i: number, campo: keyof SlideRoteiro, valor: string | false | undefined) {
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
  async function pedirReel(quaoRapido = velocidade) {
    if (!podeCortar) return;
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : '';
    const r = await fetch('/api/marketing-consultor/gerar-reel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ criativoId: criativo.id, velocidade: quaoRapido }),
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


  /**
   * Refaz só o Reel falado, com a velocidade que está no seletor.
   *
   * Não passa pela IA nem toca nas peças de texto: é o mesmo corte, renderizado
   * outra vez. Custa um minuto e nada de API.
   */
  async function refazerReel() {
    setGerando(true);
    setAvisoReel('');
    setErro('');
    try {
      await pedirReel();
      onMudou();
    } finally {
      setGerando(false);
    }
  }

  /**
   * Refaz as peças de texto com o texto que já existe.
   *
   * As três saem de UM roteiro e de UMA passagem do renderizador, então refazer
   * uma refaz as três — e é melhor assim: texto corrigido no carrossel e não no
   * PDF é o tipo de incoerência que só se descobre depois de publicar. O botão
   * fica em cada peça porque é ali que o consultor está olhando quando decide.
   */
  async function refazerTexto() {
    const texto = slides.length ? slides : (criativo.roteiro?.slides || []);
    if (!texto.length) {
      setErro('Não há texto gravado para refazer. Use "Reescrever e refazer".');
      return;
    }
    await produzirCom(texto);
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
        ocupado={servidorTrabalhando || gerando || enfileirando}
        velocidade={velocidade}
        aoMudarVelocidade={setVelocidade}
        segundosPorSlide={segundosPorSlide}
        aoMudarSegundos={setSegundosPorSlide}
        aoRefazerReel={refazerReel}
        aoRefazerTexto={refazerTexto}
        aoAprovar={onMudou}
      />
      {avisoReel && (
        <p className="text-sm text-amber-800 p-3 rounded bg-amber-50 border border-amber-200">
          {avisoReel}
        </p>
      )}

      {/* O PEDIDO FICA À VISTA.
          Estava escondido dentro do acordeão de editar o texto, junto de seis
          campos por página — e quem só queria dizer "a capa está fraca" não
          achava. É o caminho mais usado dos dois, então é o que fica aberto. */}
      <section className="p-4 rounded-lg border border-gray-200 bg-white">
        <p className="text-sm font-semibold text-gray-800">Quer mudar alguma coisa?</p>
        <p className="text-xs text-gray-600 mt-0.5 mb-2.5">
          Escreva o que incomodou e a IA reescreve o texto das peças e refaz tudo. O Reel
          com você falando não muda — ele usa a sua própria fala.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={melhoria}
            onChange={(e) => setMelhoria(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && melhoria.trim()) criarTudo(); }}
            placeholder="Ex.: a capa está fraca, comece pelo incômodo de quem nunca liderou um projeto"
            className="flex-1 min-w-[260px] px-3 py-2 rounded-lg border border-gray-300 text-sm"
          />
          <button
            onClick={criarTudo}
            disabled={gerando || enfileirando || !melhoria.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {gerando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Reescrevendo…</>
              : <><RefreshCw className="w-3.5 h-3.5" /> Pedir e refazer</>}
          </button>
        </div>
      </section>

      <details className="rounded-lg border border-gray-200 bg-white">
        <summary className="px-4 py-3 text-sm font-semibold text-gray-700 cursor-pointer">
          Prefiro eu mesmo mudar o texto, página a página
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
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-gray-400">{i + 1}</span>

                  {/* O LAYOUT DA PÁGINA.
                      Era uma etiqueta cinza, só para olhar. Trocar o layout remonta a
                      página inteira — é a mudança de design mais forte que o motor faz,
                      e estava trancada. */}
                  <select
                    value={s.type}
                    onChange={(e) => alterarSlide(i, 'type', e.target.value)}
                    title="O desenho desta página"
                    className="px-2 py-1 rounded border border-gray-300 text-xs font-semibold text-gray-800 bg-white"
                  >
                    {LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>

                  {/* Quem aparece na página. Comparação não tem espaço para ninguém. */}
                  {LAYOUTS_COM_PESSOA.has(s.type) && (
                    <select
                      value={s.pessoa === false ? 'nenhuma' : (s.pessoa || 'automatica')}
                      onChange={(e) => {
                        const v = e.target.value;
                        alterarSlide(i, 'pessoa', v === 'nenhuma' ? false : v === 'automatica' ? undefined : v);
                      }}
                      title="Quem aparece nesta página"
                      className="px-2 py-1 rounded border border-gray-300 text-xs text-gray-800 bg-white"
                    >
                      <option value="automatica">Pessoa: automática</option>
                      <option value="nenhuma">Pessoa: nenhuma</option>
                      {PESSOAS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  )}

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
                {/* Os campos que ESTE layout pede, mesmo os que ainda estão vazios:
                    trocar para "dado" sem poder escrever o número deixaria a página
                    com um espaço em branco no lugar do número gigante. */}
                {camposDoSlide(s).map((campo) => (
                  <div key={campo} className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold uppercase text-gray-400 w-16 shrink-0">{campo}</span>
                    <input
                      value={(s[campo] as string) || ''}
                      onChange={(e) => alterarSlide(i, campo, e.target.value)}
                      placeholder={campo === 'numero' ? 'Ex.: 70%' : ''}
                      className="flex-1 px-2 py-0.5 rounded border border-gray-200 text-xs text-gray-700"
                    />
                  </div>
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

          {erro && <p className="text-sm text-red-700 mt-2">{erro}</p>}
        </div>
      </details>
    </div>
  );
}

/* ====================== O que saiu ====================== */

function PecasProduzidas({
  pecas, esperando, ocupado,
  velocidade, aoMudarVelocidade,
  segundosPorSlide, aoMudarSegundos,
  aoRefazerReel, aoRefazerTexto, aoAprovar,
}: {
  pecas: Peca[];
  esperando?: boolean;
  ocupado?: boolean;
  velocidade: number;
  aoMudarVelocidade: (v: number) => void;
  segundosPorSlide: number;
  aoMudarSegundos: (v: number) => void;
  aoRefazerReel: () => void;
  aoRefazerTexto: () => void;
  aoAprovar: () => void;
}) {
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
            {/* O controle fica na peça, não num painel à parte: é olhando a peça
                que o consultor decide que ela está lenta demais. */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                {nomeDaPeca(p.tipo)}
                {p.versao > 1 && (
                  <span className="text-xs font-normal text-gray-500">versão {p.versao}</span>
                )}
              </p>

              <div className="flex items-center gap-2">
                {p.tipo === 'reel' && (
                  <Ritmo
                    rotulo="Velocidade da fala"
                    valor={velocidade}
                    aoMudar={aoMudarVelocidade}
                    opcoes={[
                      [0.9, '0,9x — mais devagar'],
                      [1, '1x — normal'],
                      [1.1, '1,1x — recomendado'],
                      [1.25, '1,25x — bem rápido'],
                      [1.5, '1,5x — no limite'],
                    ]}
                  />
                )}
                {p.tipo === 'carrossel-video' && (
                  <Ritmo
                    rotulo="Tempo por página"
                    valor={segundosPorSlide}
                    aoMudar={aoMudarSegundos}
                    opcoes={[
                      [3, '3s — rápido'],
                      [4, '4s'],
                      [5, '5s — normal'],
                      [6, '6s'],
                      [8, '8s — para ler com calma'],
                    ]}
                  />
                )}
                <BotaoRefazer
                  ocupado={ocupado}
                  aoClicar={p.tipo === 'reel' ? aoRefazerReel : aoRefazerTexto}
                  aviso={p.tipo === 'reel'
                    ? 'Corta o vídeo de novo com esta velocidade. Não usa IA.'
                    : 'Refaz o carrossel, o PDF e o carrossel em vídeo com o texto atual.'}
                />
                <BotaoAprovar peca={p} onMudou={aoAprovar} />
              </div>
            </div>
            <Previa caminho={p.arquivoUrl} />
            {/* O carrossel tem sete páginas e a prévia mostra uma. Aprovar sem ver o
                resto seria aprovar no escuro. */}
            <Anexos peca={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Aprovar e desaprovar uma peça.
 *
 * Aprovar é o que manda a peça para a etapa de publicação. Fica AQUI, ao lado da
 * peça, e não numa tela de revisão separada: o consultor decide olhando o que
 * saiu, e uma segunda tela mostrando as mesmas peças só duplicava a dúvida sobre
 * onde aprovar.
 */
function BotaoAprovar({ peca, onMudou }: { peca: Peca; onMudou: () => void }) {
  const [salvando, setSalvando] = useState(false);

  async function definir(status: Peca['status']) {
    setSalvando(true);
    try {
      await updateDoc(doc(db, COLECOES.pecas, peca.id), {
        status,
        atualizadoEm: new Date().toISOString(),
      });
      onMudou();
    } finally {
      setSalvando(false);
    }
  }

  if (peca.status === 'aprovado' || peca.status === 'publicado') {
    return (
      <span className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {peca.status === 'publicado' ? 'Publicada' : 'Aprovada'}
        </span>
        {peca.status === 'aprovado' && (
          <button
            onClick={() => definir('revisar')}
            disabled={salvando}
            title="Tira a aprovação para poder refazer"
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 disabled:opacity-50"
          >
            desfazer
          </button>
        )}
      </span>
    );
  }

  return (
    <button
      onClick={() => definir('aprovado')}
      disabled={salvando}
      title="Manda esta peça para a etapa de publicação"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
    >
      {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
      Aprovar
    </button>
  );
}

/** O seletor de ritmo de um vídeo. Rótulo curto, porque fica dentro da peça. */
function Ritmo({
  rotulo, valor, aoMudar, opcoes,
}: {
  rotulo: string;
  valor: number;
  aoMudar: (v: number) => void;
  opcoes: [number, string][];
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-gray-600">
      <span className="hidden sm:inline">{rotulo}</span>
      <select
        value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
        title={`${rotulo}. Escolha e clique em Refazer.`}
        className="px-2 py-1 rounded border border-gray-300 text-xs text-gray-800 bg-white"
      >
        {opcoes.map(([v, texto]) => (
          <option key={v} value={v}>{texto}</option>
        ))}
      </select>
    </label>
  );
}

/**
 * O botão de refazer de uma peça.
 *
 * Diz no title o que ele refaz de verdade — as peças de texto saem juntas de uma
 * passagem só do renderizador, e prometer "só esta" seria mentira.
 */
function BotaoRefazer({
  ocupado, aoClicar, aviso,
}: {
  ocupado?: boolean;
  aoClicar: () => void;
  aviso: string;
}) {
  return (
    <button
      onClick={aoClicar}
      disabled={ocupado}
      title={aviso}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
    >
      {ocupado
        ? <Loader2 className="w-3 h-3 animate-spin" />
        : <RefreshCw className="w-3 h-3" />}
      Refazer
    </button>
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
