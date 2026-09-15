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
  Sparkles, Loader2, RotateCcw, Clock, RefreshCw, Undo2, Check, CheckCircle2, Copy, FileUp,
} from 'lucide-react';
import { auth, db } from '../../../lib/firebase';
import {
  COLECOES, Campanha, Criativo, MarcaDaPeca, Peca, SlideRoteiro, VideoFonte,
  duracaoCriativo, inicioNoVideo, fimNoVideo, textoCriativo,
} from '../../../types/marketing';
import { Previa, useArquivoUrl } from './EtapasPreenchidas';
import {
  ContextoImagens, EscolhaImagem, SeletorImagemDaPagina, aplicarEscolha, semIndefinidos, useBibliotecaImagens,
} from './BibliotecaImagens';
import { BotaoRemoverPecaEnviada, EnviarPecaPronta, LegendaDaPecaEnviada } from './EnviarPecaPronta';

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
  { id: 'foto', nome: 'Foto de fundo — cena com o texto por cima', exige: [] },
  { id: 'cta', nome: 'Chamada — a palavra a comentar', exige: ['palavra'] },
];

// A lista de 12 pessoas escrita à mão saiu daqui. A tela e o renderizador passaram
// a ler a mesma biblioteca (marketing_imagens), onde as imagens geradas e as fotos
// enviadas entram ao lado delas — ver BibliotecaImagens.tsx.

/** Os campos de texto que este layout precisa, somados aos que já têm conteúdo. */
function camposDoSlide(slide: SlideRoteiro): (keyof SlideRoteiro)[] {
  const doLayout = LAYOUTS.find((l) => l.id === slide.type)?.exige || [];
  const preenchidos = (['sub', 'numero', 'fonte', 'negativo', 'positivo', 'palavra'] as const)
    .filter((c) => slide[c] !== undefined);
  return [...new Set([...doLayout, ...preenchidos])];
}


export function EtapaCriativosAprovados({
  consultorId, criativos, videos, pecas, campanhas = [], marca, onMudou,
}: {
  consultorId: string;
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

  // As peças avulsas vêm primeiro, e aparecem mesmo sem criativo nenhum: quem só
  // tem conteúdo pronto não precisa passar por vídeo e transcrição para publicar.
  const avulsas = <PecasAvulsas consultorId={consultorId} pecas={pecas} campanhas={campanhas} onMudou={onMudou} />;

  if (!aprovados.length) {
    return (
      <div className="space-y-5">
        {avulsas}
        <p className="text-sm text-gray-500 italic p-4 rounded-lg bg-gray-50 border border-dashed border-gray-300">
          Nenhum criativo aprovado ainda. Aprove na etapa 3 e ele aparece aqui.
        </p>
      </div>
    );
  }

  const criativo = aprovados.find((c) => c.id === escolhido) || aprovados[0];
  const video = videos.find((v) => v.id === criativo.videoId);

  return (
    <div className="space-y-5">
      {avulsas}
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

/**
 * Criativos prontos que não saíram de vídeo nenhum.
 *
 * Cada envio avulso cria a própria campanha, com o título dado pelo consultor —
 * é esse título que identifica a peça no calendário da etapa 5.
 */
function PecasAvulsas({
  consultorId, pecas, campanhas, onMudou,
}: {
  consultorId: string;
  pecas: Peca[];
  campanhas: Campanha[];
  onMudou: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const idsAvulsas = new Set(campanhas.filter((c) => c.origem === 'enviada').map((c) => c.id));
  const minhas = pecas
    .filter((p) => idsAvulsas.has(p.campanhaId))
    .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
  const tituloDe = (p: Peca) => campanhas.find((c) => c.id === p.campanhaId)?.titulo || '';

  return (
    <section className="p-4 rounded-lg border border-gray-200 bg-gray-50/60 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-800">Criativos prontos</p>
          <p className="text-xs text-gray-600">
            Já fez o carrossel, o Reel ou o PDF fora daqui? Envie e ele entra na mesma esteira de aprovação e agenda.
          </p>
        </div>
        {!aberto && (
          <button
            onClick={() => setAberto(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-300 bg-white text-blue-700 text-sm font-semibold hover:bg-blue-50"
          >
            <FileUp className="w-4 h-4" /> Enviar criativo pronto
          </button>
        )}
      </div>

      {aberto && (
        <div className="p-3 rounded-lg bg-white border border-gray-200">
          <EnviarPecaPronta
            consultorId={consultorId}
            aoEnviar={() => { setAberto(false); onMudou(); }}
            aoCancelar={() => setAberto(false)}
          />
        </div>
      )}

      {minhas.map((p) => (
        <div key={p.id}>
          <p className="text-xs font-bold text-gray-500 mb-1">{tituloDe(p)}</p>
          <PecaEnviada peca={p} aoMudar={onMudou} />
        </div>
      ))}
    </section>
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
  const [enviandoPronta, setEnviandoPronta] = useState(false);
  const biblioteca = useBibliotecaImagens(criativo.consultorId);

  // O QUE APARECE NO EDITOR É O TEXTO QUE GEROU AS IMAGENS.
  //
  // Vinha do criativo, que guarda sempre a última versão escrita pela IA. Quando
  // essa versão era mais nova que as imagens — a IA reescreveu e a produção ainda
  // não rodou — a tela mostrava a página 3 nova ao lado da figura da página 3
  // velha, e o consultor corrigia um texto que não era o da figura.
  //
  // Agora vem da campanha, que guarda o texto exato que foi renderizado. Os dois
  // são o mesmo par por construção. Se a IA tiver escrito algo mais novo, a tela
  // avisa e deixa carregar — mas não troca sozinha.
  const campanhaDoTexto = campanhas.find((c) => c.id === `${criativo.id}__pecas`);
  const textoRenderizado = campanhaDoTexto?.roteiro;
  // NAO DA PARA PROVAR QUE O TEXTO AO LADO É O DA IMAGEM.
  //
  // Dois casos, e o segundo é o que me escapou: ou a IA escreveu algo mais novo do
  // que virou figura, OU a campanha é anterior a esta plataforma guardar o texto
  // usado, e aí simplesmente não se sabe. Na primeira versão o aviso exigia a data
  // guardada para disparar — então na campanha que não tinha a data, que é
  // justamente a que corria mais risco, ele ficava calado.
  //
  // Aviso que só funciona no caso fácil não serve. O padrão passa a ser desconfiar.
  const naoSeiSeBate = Boolean(
    !campanhaDoTexto?.roteiro?.length
    || (criativo.roteiro?.geradoEm
      && campanhaDoTexto?.roteiroGeradoEm
      && criativo.roteiro.geradoEm > campanhaDoTexto.roteiroGeradoEm),
  );

  useEffect(() => {
    setSlides(textoRenderizado?.length ? textoRenderizado : (criativo.roteiro?.slides || []));
    setErro('');
    setMelhoria('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  //
  // E CADA PEÇA COM O SEU. Um "trabalhando" só para tudo fazia o Refazer do Reel
  // travar o carrossel, e o Refazer da capa travar o Reel. O Reel, a capa e as
  // peças de texto são produções separadas, e cada uma mostra o próprio estado.
  const campanhaDoReel = campanhas.find((c) => c.id === campanhaReel);
  const reelNoServidor = campanhaDoReel?.status === 'processando';
  const textoNoServidor = campanhas.some((c) => c.id === campanhaId && c.status === 'processando');
  const servidorTrabalhando = reelNoServidor || textoNoServidor;
  const [refazendoReel, setRefazendoReel] = useState(false);

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

  /**
   * A configuração de produção destas páginas.
   *
   * UMA função para a produção e para a prévia de imagem: a página que o consultor
   * aprova com a imagem candidata tem de sair exatamente como vai sair no carrossel.
   */
  function montarRender(paginas: SlideRoteiro[]) {
    return semIndefinidos({
      date: new Date().toISOString().slice(0, 10),
      slug: criativo.id.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60),
      folderType: 'Carrossel',
      sequence: Math.min(99, Math.max(1, criativo.ordem || 1)),
      video: { enabled: true, secondsPerSlide: segundosPorSlide },
      // Sem marca, o renderizador cai no padrão LBW — que é o que ele fazia
      // antes de este campo existir.
      ...(marca ? { marca } : {}),
      signature: assinatura(video),
      slides: paginas,
    });
  }

  /** Põe na página a imagem escolhida, trocando o layout quando o dela não comporta. */
  function trocarImagem(indice: number, escolha: EscolhaImagem) {
    setSlides((atual) => atual.map((s, j) => (j === indice ? aplicarEscolha(s, escolha) : s)));
  }

  /** Manda para a fila de produção o texto que foi passado. */
  async function produzirCom(recebidas: SlideRoteiro[]) {
    const paginas = semVazios(recebidas);
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
        // O par imagem+texto nasce aqui e fica junto. Ver o comentário no tipo.
        roteiro: paginas,
        roteiroGeradoEm: agora,
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
        render: montarRender(paginas),
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

  /**
   * Muda um campo de uma página.
   *
   * APAGAR A CHAVE, e não guardar `undefined` nela. O Firestore recusa o documento
   * INTEIRO quando encontra undefined em qualquer campo — e era isso que acontecia:
   * escolher "Pessoa: automática" punha undefined no slide, o setDoc da campanha
   * falhava, a tarefa nunca entrava na fila, e o Refazer "processava" sem mudar
   * nada. O consultor via as imagens antigas ao lado do texto novo e concluía,
   * com razão, que a tela não batia.
   */
  function alterarSlide(i: number, campo: keyof SlideRoteiro, valor: string | false | undefined) {
    setSlides((atual) => atual.map((s, j) => {
      if (j !== i) return s;
      const novo: SlideRoteiro = { ...s };
      if (valor === undefined) delete novo[campo];
      else (novo as any)[campo] = valor;
      return novo;
    }));
  }

  /**
   * Tira qualquer `undefined` antes de gravar.
   *
   * Cinto e suspensório: a função acima já apaga a chave, mas um undefined vindo de
   * outro caminho derrubaria a gravação inteira do mesmo jeito, e o sintoma — um
   * botão que não faz nada — é caro de diagnosticar.
   */
  function semVazios(paginas: SlideRoteiro[]): SlideRoteiro[] {
    return paginas.map((p) => Object.fromEntries(
      Object.entries(p).filter(([, v]) => v !== undefined),
    ) as SlideRoteiro);
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
    setRefazendoReel(true);
    setAvisoReel('');
    setErro('');
    try {
      await pedirReel();
      onMudou();
    } finally {
      setRefazendoReel(false);
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

        <PecaProntaDoCriativo
          consultorId={criativo.consultorId}
          campanhaId={campanhaId}
          aberto={enviandoPronta}
          aoAbrir={setEnviandoPronta}
          aoEnviar={() => { setEnviandoPronta(false); onMudou(); }}
        />
      </section>
    );
  }

  const contextoImagens = {
    consultorId: criativo.consultorId,
    criativoId: criativo.id,
    slides,
    montarRender,
    imagensPorPagina: campanhaDoTexto?.imagensPorPagina,
    trocarImagem,
    biblioteca,
  };

  return (
    <ContextoImagens.Provider value={contextoImagens}>
    <div className="space-y-4">
      {/* AS PEÇAS PRIMEIRO, e cada uma com o que dá para mexer NELA.
          O texto ficava num acordeão lá embaixo, longe da página que estava sendo
          corrigida — quem revisa precisa ver o que está mudando enquanto muda. */}
      <PecasProduzidas
        pecas={daCampanha}
        esperando={servidorTrabalhando || gerando || enfileirando || refazendoReel}
        ocupadoReel={reelNoServidor || refazendoReel || gerando}
        ocupadoTexto={textoNoServidor || enfileirando || gerando}
        campanhaDoReel={campanhaDoReel}
        criativo={criativo}
        video={video}
        slides={slides}
        velocidade={velocidade}
        aoMudarVelocidade={setVelocidade}
        segundosPorSlide={segundosPorSlide}
        aoMudarSegundos={setSegundosPorSlide}
        aoRefazerReel={refazerReel}
        aoRefazerTexto={refazerTexto}
        aoAprovar={onMudou}
        aoAlterarSlide={alterarSlide}
        aoDesfazerSlides={() => setSlides(textoRenderizado?.length ? textoRenderizado : (criativo.roteiro?.slides || []))}
        naoSeiSeBate={naoSeiSeBate && daCampanha.length > 0}
        melhoria={melhoria}
        aoMudarMelhoria={setMelhoria}
        aoPedirIa={criarTudo}
        aoUsarTextoNovo={refazerTexto}
      />
      {avisoReel && (
        <p className="text-sm text-amber-800 p-3 rounded bg-amber-50 border border-amber-200">
          {avisoReel}
        </p>
      )}

      {/* A IMAGEM ÚNICA DO LINKEDIN.
          É a capa do carrossel, que também serve sozinha: no LinkedIn um post de
          uma imagem tem alcance diferente do documento, e o consultor quer poder
          escolher. Não é uma peça nova do renderizador — é a mesma capa, mostrada
          para o que ela serve. O texto ao lado é o MESMO artigo do PDF: é o mesmo
          post, então mudar num muda no outro. */}
      <ImagemUnicaLinkedin
        criativo={criativo}
        pecas={daCampanha}
        slides={slides}
        ocupado={textoNoServidor || gerando || enfileirando}
        aoAlterarSlide={alterarSlide}
        aoRefazer={refazerTexto}
      />

      <PecaProntaDoCriativo
        consultorId={criativo.consultorId}
        campanhaId={campanhaId}
        aberto={enviandoPronta}
        aoAbrir={setEnviandoPronta}
        aoEnviar={() => { setEnviandoPronta(false); onMudou(); }}
      />

      {erro && <p className="text-sm text-red-700">{erro}</p>}
    </div>
    </ContextoImagens.Provider>
  );
}

/**
 * O criativo pronto, feito fora daqui, para ESTE trecho.
 *
 * Fica fechado por padrão: é a alternativa, não o caminho principal — mas à vista,
 * para quem já tem o carrossel feito não achar que precisa gerar outro.
 */
function PecaProntaDoCriativo({
  consultorId, campanhaId, aberto, aoAbrir, aoEnviar,
}: {
  consultorId: string;
  campanhaId: string;
  aberto: boolean;
  aoAbrir: (v: boolean) => void;
  aoEnviar: () => void;
}) {
  if (!aberto) {
    return (
      <button
        onClick={() => aoAbrir(true)}
        className="flex items-center gap-1.5 mt-3 text-sm font-semibold text-blue-700 hover:underline"
      >
        <FileUp className="w-4 h-4" /> Já tenho o criativo pronto — enviar o meu
      </button>
    );
  }
  return (
    <section className="mt-3 p-4 rounded-lg border border-gray-200 bg-white">
      <p className="text-sm font-semibold text-gray-800 mb-1">Enviar o seu criativo pronto</p>
      <p className="text-xs text-gray-600 mb-3">
        Ele entra ao lado das peças deste trecho, para aprovar e agendar do mesmo jeito.
      </p>
      <EnviarPecaPronta
        consultorId={consultorId}
        campanhaId={campanhaId}
        aoEnviar={aoEnviar}
        aoCancelar={() => aoAbrir(false)}
      />
    </section>
  );
}

/**
 * A capa do carrossel oferecida como post de uma imagem só no LinkedIn.
 *
 * Fica no fim porque é a alternativa ao documento, não a peça principal.
 */
function ImagemUnicaLinkedin({
  criativo, pecas, slides, ocupado, aoAlterarSlide, aoRefazer,
}: {
  criativo: Criativo;
  pecas: Peca[];
  slides: SlideRoteiro[];
  ocupado?: boolean;
  aoAlterarSlide: (i: number, campo: keyof SlideRoteiro, valor: string | false | undefined) => void;
  aoRefazer: () => void;
}) {
  // A capa do carrossel GERADO: é a página 1 do texto editável ao lado. Um carrossel
  // enviado pelo consultor não tem esse texto.
  const feed = pecas.find((p) => p.tipo === 'carrossel-feed' && p.origem !== 'enviada');
  const capa = (feed?.arquivos || []).filter((c) => /slide-\d+\.png$/i.test(c)).sort()[0];
  if (!capa) return null;

  // A capa É a página 1 do carrossel. Mexer aqui é mexer lá, de propósito: são a
  // mesma imagem, e manter duas cópias do mesmo texto daria dois textos diferentes.
  const paginaDaCapa = slides[0];

  return (
    <section className="p-4 rounded-lg border border-gray-200 bg-white">
      <p className="text-sm font-semibold text-gray-800 mb-3">Imagem única para o LinkedIn</p>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="lg:w-[300px] shrink-0">
          <ImagemDoArquivo caminho={capa} className="w-full rounded-lg border border-gray-200" />
          <p className="text-[11px] text-gray-500 mt-1">
            É a capa do carrossel. Para um post de imagem só, em vez do documento.
          </p>
        </div>

        <div className="flex-1 min-w-0">
          {/* O TEXTO DA IMAGEM, para mudar o que está escrito nela. */}
          {paginaDaCapa ? (
            <>
              <p className="text-sm font-semibold text-gray-800 mb-2">Texto da imagem</p>
              <EditorDaPagina indice={0} slide={paginaDaCapa} aoAlterar={aoAlterarSlide} />
              <p className="text-[11px] text-gray-500 mt-2">
                É a página 1 do carrossel do feed. Mudar aqui muda lá — e o
                <strong> Refazer do carrossel</strong> refaz esta imagem também.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500 italic">
              O texto desta imagem não está guardado.
            </p>
          )}

          {/* E SÓ DEPOIS o artigo que acompanha o post. */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <TextoParaPublicar
              criativo={criativo}
              campo="artigoLinkedin"
              titulo="Artigo do LinkedIn"
              ajuda="O mesmo texto do documento PDF — é o mesmo post. Mudar aqui muda lá."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ====================== O que saiu ====================== */

/**
 * As peças produzidas, cada uma com o que dá para mexer nela.
 *
 * A ficha muda por tipo de propósito. Um carrossel se revisa página a página,
 * olhando a página; um PDF se revisa lendo o artigo que vai junto. Mostrar os
 * quatro do mesmo jeito obrigava o consultor a procurar onde editar cada coisa.
 */
function PecasProduzidas({
  pecas, esperando, ocupadoReel, ocupadoTexto, campanhaDoReel, criativo, video, slides,
  velocidade, aoMudarVelocidade,
  segundosPorSlide, aoMudarSegundos,
  aoRefazerReel, aoRefazerTexto, aoAprovar, aoAlterarSlide, aoDesfazerSlides,
  naoSeiSeBate, melhoria, aoMudarMelhoria, aoPedirIa, aoUsarTextoNovo,
}: {
  pecas: Peca[];
  esperando?: boolean;
  /** O Reel e as peças de texto trabalham separados; cada uma trava só a si. */
  ocupadoReel?: boolean;
  ocupadoTexto?: boolean;
  /** Onde fica o estado de trabalho da capa, que é separado do Reel. */
  campanhaDoReel?: Campanha;
  criativo: Criativo;
  video?: VideoFonte;
  slides: SlideRoteiro[];
  velocidade: number;
  aoMudarVelocidade: (v: number) => void;
  segundosPorSlide: number;
  aoMudarSegundos: (v: number) => void;
  aoRefazerReel: () => void;
  aoRefazerTexto: () => void;
  aoAprovar: () => void;
  aoAlterarSlide: (i: number, campo: keyof SlideRoteiro, valor: string | false | undefined) => void;
  aoDesfazerSlides: () => void;
  naoSeiSeBate?: boolean;
  melhoria: string;
  aoMudarMelhoria: (v: string) => void;
  aoPedirIa: () => void;
  aoUsarTextoNovo: () => void;
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

  // A ordem é a de importância para quem publica, não a que o servidor gravou.
  const ordem: Peca['tipo'][] = ['reel', 'carrossel-feed', 'carrossel-video', 'linkedin-pdf'];
  const ordenadas = [...pecas].sort((a, b) => ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo));

  return (
    <div className="space-y-4">
      {ordenadas.map((p) => {
        if (p.origem === 'enviada') return <PecaEnviada key={p.id} peca={p} aoMudar={aoAprovar} />;
        const ocupado = p.tipo === 'reel' ? ocupadoReel : ocupadoTexto;
        return (
        <React.Fragment key={p.id}>
        <section className={cartaoDaPeca(p.status === 'aprovado' || p.status === 'publicado')}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              {nomeDaPeca(p.tipo)}
              {p.versao > 1 && (
                <span className="text-xs font-normal text-gray-500">versão {p.versao}</span>
              )}
              {ocupado && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                  <Loader2 className="w-3 h-3 animate-spin" /> refazendo…
                </span>
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
              {/* UM Refazer por peça, sempre no mesmo canto. As de texto saem todas
                  de uma passagem, então qualquer um deles refaz as quatro — o aviso
                  diz isso, para o clique não surpreender. */}
              <BotaoRefazer
                ocupado={ocupado}
                aoClicar={p.tipo === 'reel' ? aoRefazerReel : aoRefazerTexto}
                aviso={p.tipo === 'reel'
                  ? 'Corta o vídeo de novo com esta velocidade. Não usa IA.'
                  : 'Refaz esta peça e as outras de texto: elas saem de uma produção só.'}
              />
              <BotaoAprovar peca={p} onMudou={aoAprovar} />
            </div>
          </div>

          {p.tipo === 'carrossel-feed' && (
            <FichaCarrossel
              peca={p}
              slides={slides}
              naoSeiSeBate={naoSeiSeBate}
              ocupado={ocupado}
              segundosPorSlide={segundosPorSlide}
              aoMudarSegundos={aoMudarSegundos}
              melhoria={melhoria}
              aoMudarMelhoria={aoMudarMelhoria}
              aoPedirIa={aoPedirIa}
              aoAlterarSlide={aoAlterarSlide}
              aoRefazer={aoRefazerTexto}
              aoDesfazer={aoDesfazerSlides}
              aoUsarTextoNovo={aoUsarTextoNovo}
            />
          )}
          {p.tipo === 'linkedin-pdf' && (
            <FichaComTexto
              peca={p}
              criativo={criativo}
              campo="artigoLinkedin"
              titulo="Artigo do LinkedIn"
              ajuda="Pronto para colar. As páginas do PDF são as do carrossel do feed — mude e refaça lá que muda aqui."
            />
          )}
          {p.tipo === 'carrossel-video' && (
            <FichaComTexto
              peca={p}
              criativo={criativo}
              campo="legendaInstagram"
              titulo="Legenda do Instagram"
              ajuda="Pronta para colar — é a mesma legenda do Reel, é o mesmo post. As páginas e o ritmo deste vídeo saem do carrossel do feed, aqui em cima."
            />
          )}
          {p.tipo === 'reel' && (
            <FichaComTexto
              peca={p}
              criativo={criativo}
              video={video}
              campo="legendaInstagram"
              titulo="Legenda do Instagram"
              ajuda="Pronta para colar. É a mesma legenda do carrossel em vídeo — é o mesmo post."
            />
          )}
        </section>

        {/* A CAPA DO REEL É UMA PEÇA À PARTE: estado, Refazer e Aprovar próprios.
            Ficava dentro do cartão do Reel, sem aprovação, e o Refazer de um
            travava o outro. */}
        {p.tipo === 'reel' && (
          <CartaoCapaDoReel
            peca={p}
            criativo={criativo}
            video={video}
            campanhaDoReel={campanhaDoReel}
            aoMudar={aoAprovar}
          />
        )}
        </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * A capa do Reel, como peça independente do Reel.
 *
 * Refazer a capa não corta o vídeo de novo, e refazer o Reel não mexe na capa.
 * Cada um é aprovado por si: o consultor pode aprovar a capa e continuar ajustando
 * a velocidade do vídeo, ou o contrário.
 */
function CartaoCapaDoReel({
  peca, criativo, video, campanhaDoReel, aoMudar,
}: {
  peca: Peca;
  criativo: Criativo;
  video?: VideoFonte;
  campanhaDoReel?: Campanha;
  aoMudar: () => void;
}) {
  const [aprovando, setAprovando] = useState(false);
  const refazendo = campanhaDoReel?.capaStatus === 'processando';
  const aprovada = peca.capaStatus === 'aprovado';

  async function definir(capaStatus: 'revisar' | 'aprovado') {
    setAprovando(true);
    try {
      await updateDoc(doc(db, COLECOES.pecas, peca.id), { capaStatus, atualizadoEm: new Date().toISOString() });
      aoMudar();
    } finally {
      setAprovando(false);
    }
  }

  return (
    <section className={cartaoDaPeca(aprovada)}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
          Capa do Reel
          {refazendo && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
              <Loader2 className="w-3 h-3 animate-spin" /> refazendo…
            </span>
          )}
        </p>
        {peca.capaUrl && (aprovada ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-600 text-white text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Capa aprovada
            </span>
            <button
              onClick={() => definir('revisar')}
              disabled={aprovando}
              title="Tira a aprovação da capa. O Reel continua como está."
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 disabled:opacity-50"
            >
              desfazer
            </button>
          </span>
        ) : (
          <button
            onClick={() => definir('aprovado')}
            disabled={aprovando || refazendo}
            title="Aprova só a capa. O Reel tem a aprovação dele."
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {aprovando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Aprovar capa
          </button>
        ))}
      </div>

      {campanhaDoReel?.capaStatus === 'erro' && (
        <p className="text-xs text-red-700 mb-2">
          A última tentativa de refazer a capa falhou{campanhaDoReel.capaErro ? `: ${campanhaDoReel.capaErro}` : '.'}
        </p>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="lg:w-[300px] shrink-0">
          {peca.capaUrl
            ? <ImagemDoArquivo caminho={peca.capaUrl} className="w-full rounded border border-gray-200" />
            : <p className="text-xs text-gray-500 italic">Ainda não há capa. Preencha ao lado e clique em Refazer a capa.</p>}
        </div>
        <div className="flex-1 min-w-0">
          <ArteDaCapa criativo={criativo} video={video} refazendo={refazendo} onRefeita={aoMudar} />
        </div>
      </div>
    </section>
  );
}

/**
 * Uma peça que o consultor enviou pronta.
 *
 * Sem Refazer, sem ritmo, sem editor de páginas — não há texto nem render de onde
 * refazer. O que se faz com ela é olhar, ajustar a legenda, aprovar ou tirar.
 */
/**
 * O cartão de uma peça: VERDE quando aprovada.
 *
 * A etiqueta pequena de "Aprovada" no canto se perdia no meio de quatro cartões
 * iguais. O cartão inteiro verde diz de longe o que já foi para a publicação e o
 * que ainda falta revisar.
 */
function cartaoDaPeca(aprovada: boolean) {
  return aprovada
    ? 'p-4 rounded-lg border-2 border-green-500 bg-green-50'
    : 'p-4 rounded-lg border border-gray-200 bg-white';
}

export function PecaEnviada({ peca, aoMudar }: { peca: Peca; aoMudar: () => void }) {
  const imagens = (peca.arquivos || []).filter((c) => /slide-\d+\.(png|jpe?g|webp)$/i.test(c)).sort();
  return (
    <section className={cartaoDaPeca(peca.status === 'aprovado' || peca.status === 'publicado')}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
          {nomeDaPeca(peca.tipo)}
          <span className="text-xs font-normal px-1.5 py-0.5 rounded bg-blue-50 text-blue-800">enviada por você</span>
        </p>
        <div className="flex items-center gap-2">
          <BotaoRemoverPecaEnviada peca={peca} aoMudar={aoMudar} />
          <BotaoAprovar peca={peca} onMudou={aoMudar} />
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="lg:w-[340px] shrink-0">
          {imagens.length > 1 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {imagens.map((c, i) => (
                <div key={c} className="relative">
                  <ImagemDoArquivo caminho={c} className="w-full aspect-[4/5] object-cover rounded border border-gray-200" />
                  <span className="absolute bottom-0 right-0 px-1 text-[10px] font-bold bg-white/80 text-gray-700">{i + 1}</span>
                </div>
              ))}
            </div>
          ) : (
            <Previa caminho={peca.arquivoUrl} />
          )}
          {peca.capaUrl && (
            <div className="mt-2">
              <p className="text-[11px] font-bold uppercase text-gray-400 mb-1">Capa</p>
              <ImagemDoArquivo caminho={peca.capaUrl} className="w-24 rounded border border-gray-200" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <LegendaDaPecaEnviada peca={peca} aoMudar={aoMudar} />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

/**
 * A ficha do carrossel: as páginas em cima, a escolhida grande, e o editor dela
 * ao lado.
 *
 * Antes era uma imagem só, com o editor escondido num acordeão lá embaixo, longe
 * da página que estava sendo corrigida. Quem revisa precisa ver o que está
 * mudando enquanto muda.
 */
function FichaCarrossel({
  peca, slides, naoSeiSeBate, ocupado, melhoria, aoMudarMelhoria, aoPedirIa,
  aoAlterarSlide, aoRefazer, aoDesfazer, aoUsarTextoNovo,
  segundosPorSlide, aoMudarSegundos,
}: {
  peca: Peca;
  slides: SlideRoteiro[];
  naoSeiSeBate?: boolean;
  ocupado?: boolean;
  segundosPorSlide: number;
  aoMudarSegundos: (v: number) => void;
  melhoria: string;
  aoMudarMelhoria: (v: string) => void;
  aoPedirIa: () => void;
  aoAlterarSlide: (i: number, campo: keyof SlideRoteiro, valor: string | false | undefined) => void;
  aoRefazer: () => void;
  aoDesfazer: () => void;
  aoUsarTextoNovo: () => void;
}) {
  const [aberta, setAberta] = useState(0);

  // Só os PNGs das páginas, na ordem. O que não for página fica de fora: a lista
  // de arquivos da peça também traz capa e sobras, e elas não são páginas.
  const paginas = useMemo(
    () => (peca.arquivos || [])
      .filter((c) => /slide-\d+\.png$/i.test(c))
      .sort((a, b) => a.localeCompare(b)),
    [peca.arquivos],
  );

  useEffect(() => { setAberta(0); }, [peca.id]);

  if (!paginas.length) return <Previa caminho={peca.arquivoUrl} />;

  const indice = Math.min(aberta, paginas.length - 1);
  const slide = slides[indice];

  return (
    <div className="space-y-3">
      {/* Diz alto quando o texto ao lado ainda não é o texto destas imagens. */}
      {naoSeiSeBate && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 p-2.5 rounded bg-amber-50 border border-amber-300">
          <span>
            <strong>Estas imagens ainda não foram feitas com este texto.</strong> Clique em
            Refazer com estas mudanças para elas ficarem iguais ao que está escrito aqui.
          </span>
          <button
            onClick={aoUsarTextoNovo}
            disabled={ocupado}
            className="px-2.5 py-1 rounded bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:opacity-50"
          >
            Refazer agora
          </button>
        </div>
      )}
      {/* Todas as páginas, pequenas. Clicar troca a grande de baixo. */}
      <div className="flex flex-wrap gap-2">
        {paginas.map((c, i) => (
          <button
            key={c}
            onClick={() => setAberta(i)}
            title={`Página ${i + 1}`}
            className={`relative rounded border-2 overflow-hidden transition-colors ${
              i === indice ? 'border-blue-500' : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <ImagemDoArquivo caminho={c} className="w-16 h-20 object-cover block" />
            <span className={`absolute bottom-0 right-0 px-1 text-[10px] font-bold ${
              i === indice ? 'bg-blue-500 text-white' : 'bg-white/80 text-gray-700'
            }`}>
              {i + 1}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* A página escolhida, grande. Uma só. */}
        <div className="lg:w-[340px] shrink-0">
          <ImagemDoArquivo
            caminho={paginas[indice]}
            className="w-full rounded-lg border border-gray-200 bg-gray-50"
          />
        </div>

        {/* O texto desta página, já preenchido com o que está na imagem. */}
        <div className="flex-1 min-w-0">
          {!slide ? (
            <p className="text-sm text-gray-500 italic">
              O texto desta página não está guardado. Use "Pedir e refazer" para a IA
              escrever de novo.
            </p>
          ) : (
            <EditorDaPagina
              indice={indice}
              slide={slide}
              aoAlterar={aoAlterarSlide}
            />
          )}

          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={aoDesfazer}
              title="Volta ao texto que gerou estas imagens"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Desfazer
            </button>
            <span className="text-[11px] text-gray-500">
              Editou? Clique em <strong>Refazer</strong>, no canto de cima deste cartão.
            </span>
          </div>

          {/* Pedir à IA fica AQUI, junto do texto que ela vai reescrever, e não
              numa caixa solta no fim da tela. */}
          <div className="flex flex-wrap gap-2 mt-2">
            <input
              value={melhoria}
              onChange={(e) => aoMudarMelhoria(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && melhoria.trim()) aoPedirIa(); }}
              placeholder="Ou peça à IA: a capa está fraca, comece pelo incômodo de quem nunca liderou um projeto"
              className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-gray-300 text-sm"
            />
            <button
              onClick={aoPedirIa}
              disabled={ocupado || !melhoria.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-300 bg-white text-blue-700 text-sm font-semibold hover:bg-blue-50 disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Pedir à IA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Os campos de uma página do carrossel. */
function EditorDaPagina({
  indice, slide, aoAlterar,
}: {
  indice: number;
  slide: SlideRoteiro;
  aoAlterar: (i: number, campo: keyof SlideRoteiro, valor: string | false | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-gray-400">Página {indice + 1}</span>

        <select
          value={slide.type}
          onChange={(e) => aoAlterar(indice, 'type', e.target.value)}
          title="O desenho desta página"
          className="px-2 py-1 rounded border border-gray-300 text-xs font-semibold text-gray-800 bg-white"
        >
          {LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>

        <select
          value={String(slide.escala ?? 1)}
          onChange={(e) => aoAlterar(indice, 'escala', e.target.value)}
          title="O tamanho do texto desta página"
          className="px-2 py-1 rounded border border-gray-300 text-xs text-gray-800 bg-white"
        >
          <option value="0.85">Texto menor</option>
          <option value="1">Texto normal</option>
          <option value="1.15">Texto maior</option>
        </select>

        <ContadorPalavras slide={slide} />
      </div>

      {/* Quem ou o que aparece na página, com miniatura. Só existe dentro da
          produção, que é quem sabe montar a prévia. */}
      <SeletorImagemDaPagina indice={indice} slide={slide} />

      <input
        value={slide.title}
        onChange={(e) => aoAlterar(indice, 'title', e.target.value)}
        placeholder="Título"
        className="w-full px-2 py-1.5 rounded border border-gray-200 focus:border-blue-400 focus:outline-none font-bold text-gray-900 text-sm"
      />
      <textarea
        value={slide.body}
        onChange={(e) => aoAlterar(indice, 'body', e.target.value)}
        rows={3}
        placeholder="Texto"
        className="w-full px-2 py-1.5 rounded border border-gray-200 focus:border-blue-400 focus:outline-none text-sm text-gray-700 resize-y"
      />
      {camposDoSlide(slide).map((campo) => (
        <div key={campo} className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase text-gray-400 w-16 shrink-0">{campo}</span>
          <input
            value={(slide[campo] as string) || ''}
            onChange={(e) => aoAlterar(indice, campo, e.target.value)}
            placeholder={campo === 'numero' ? 'Ex.: 70%' : ''}
            className="flex-1 px-2 py-0.5 rounded border border-gray-200 text-xs text-gray-700"
          />
        </div>
      ))}
      <p className="text-[11px] text-gray-500">
        Use *asteriscos* para destacar em azul. No máximo 32 palavras por página.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- */

/**
 * A peça de um lado, o texto de publicar do outro.
 *
 * Serve o PDF (artigo do LinkedIn), o carrossel em vídeo e o Reel (legenda do
 * Instagram). O texto fica no criativo, e não em arquivo: é o que se revisa e se
 * copia, e um .md dentro do Storage não servia para nenhuma das duas coisas.
 */
function FichaComTexto({
  peca, criativo, campo, titulo, ajuda,
}: {
  peca: Peca;
  criativo: Criativo;
  video?: VideoFonte;
  campo: 'artigoLinkedin' | 'legendaInstagram';
  titulo: string;
  ajuda: string;
}) {
  // A capa do Reel saiu daqui: virou o cartão próprio dela (CartaoCapaDoReel).
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="lg:w-[300px] shrink-0">
        <Previa caminho={peca.arquivoUrl} />
      </div>
      <div className="flex-1 min-w-0">
        <TextoParaPublicar criativo={criativo} campo={campo} titulo={titulo} ajuda={ajuda} />
      </div>
    </div>
  );
}

/**
 * Um texto pronto para colar, editável e copiável.
 *
 * Vive no criativo, e não em arquivo. Antes a "legenda" era um legenda.md solto
 * dentro de cada pasta do Storage: o consultor não tinha como revisar nem copiar,
 * e o arquivo só ocupava espaço na lista da peça.
 *
 * O MESMO campo aparece em mais de um lugar de propósito — o artigo do LinkedIn
 * está no documento e na imagem única; a legenda do Instagram está no Reel e no
 * carrossel em vídeo. É o mesmo post em cada caso, então é o mesmo texto, e editar
 * num lugar muda no outro.
 */
function TextoParaPublicar({
  criativo, campo, titulo, ajuda,
}: {
  criativo: Criativo;
  campo: 'artigoLinkedin' | 'legendaInstagram';
  titulo: string;
  ajuda: string;
}) {
  const gravado = criativo.textos?.[campo] || '';
  const [texto, setTexto] = useState(gravado);
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState('');

  // Trocar de criativo, ou a IA reescrever, tem que trazer o texto novo para a tela.
  useEffect(() => { setTexto(gravado); }, [criativo.id, gravado]);

  const mudou = texto !== gravado;

  async function salvar() {
    setSalvando(true);
    setErro('');
    try {
      await updateDoc(doc(db, COLECOES.criativos, criativo.id), {
        [`textos.${campo}`]: texto,
        atualizadoEm: new Date().toISOString(),
      });
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro('O navegador não deixou copiar. Selecione o texto e copie à mão.');
    }
  }

  const palavras = texto.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">{titulo}</p>
        <span className="text-[11px] text-gray-500">{palavras} palavras</span>
      </div>
      <p className="text-xs text-gray-600 mt-0.5 mb-2">{ajuda}</p>

      {texto || mudou ? (
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={12}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 font-normal leading-relaxed resize-y"
        />
      ) : (
        <p className="text-sm text-gray-500 italic p-3 rounded bg-gray-50 border border-dashed border-gray-300">
          Ainda não há texto. Ele é escrito junto com as peças — peça à IA no carrossel
          do feed para ela escrever.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-2">
        <button
          onClick={copiar}
          disabled={!texto}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
        >
          {copiado ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
        {mudou && (
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Salvar
          </button>
        )}
        {mudou && !salvando && (
          <span className="text-[11px] text-amber-700 font-semibold">alterações não salvas</span>
        )}
      </div>
      {erro && <p className="text-sm text-red-700 mt-2">{erro}</p>}
    </div>
  );
}

const CURSOS: { id: string; nome: string }[] = [
  { id: 'white-belt', nome: 'White Belt — fundo branco' },
  { id: 'yellow-belt', nome: 'Yellow Belt — fundo amarelo' },
  { id: 'green-belt', nome: 'Green Belt — fundo verde' },
  { id: 'black-belt', nome: 'Black Belt — fundo preto' },
];

/**
 * Os campos da arte da capa do Reel.
 *
 * A capa segue o padrão de squads/lbw-reel-production/pipeline/data/cover-standard.md:
 * marca, curso e episódio, gancho curto, retrato grande. Ela é DESENHADA — do vídeo
 * sai só o rosto. Antes a plataforma arrancava um quadro inteiro do Reel montado,
 * com slide e legenda karaokê dentro, que no feed vira uma miniatura ilegível.
 *
 * NADA AQUI É OBRIGATÓRIO. De 3 a 6 palavras no gancho é o que se lê numa
 * miniatura, e a tela avisa — mas não impede. Campo apagado fica apagado.
 */
function ArteDaCapa({
  criativo, video, refazendo, onRefeita,
}: {
  criativo: Criativo;
  video?: VideoFonte;
  /** A capa já está sendo refeita no servidor. */
  refazendo?: boolean;
  onRefeita?: () => void;
}) {
  const gravada = criativo.capa || {};

  // VAZIO QUER DIZER VAZIO. Com `||`, o campo que o consultor apagou voltava com o
  // padrão na próxima vez que a tela abria — foi exatamente a reclamação. O padrão
  // só vale para o campo que nunca foi gravado.
  const ou = (valor: string | undefined, padrao: string) => (valor === undefined || valor === null ? padrao : valor);

  // OS CAMPOS MOSTRAM O QUE A ARTE USA, e não um exemplo cinza.
  //
  // Antes eram placeholders: o campo do gancho sugeria "LEAN SIX SIGMA / É MÉTODO"
  // e o do assunto sugeria "MELHORIA CONTÍNUA", enquanto a arte usava o título do
  // criativo e a série do vídeo ("PARTE 1"). A tela dizia uma coisa e a imagem
  // mostrava outra, sem nenhum jeito de descobrir de onde vinha o quê.
  //
  // Estes são os MESMOS padrões do servidor. Se um mudar lá, muda aqui.
  const ganchoPadrao = ganchoDoTitulo(criativo.titulo);
  const assuntoPadrao = (video?.serie || video?.curso || 'MELHORIA CONTÍNUA').toUpperCase();

  const episodioPadrao = String(criativo.ordem || 1).padStart(2, '0');
  const [curso, setCurso] = useState(gravada.courseKey || 'white-belt');
  const [serie, setSerie] = useState(ou(gravada.seriesLabel, 'WHITE BELT'));
  const [episodio, setEpisodio] = useState(ou(gravada.episode, episodioPadrao));
  const [gancho, setGancho] = useState((gravada.hookLines ?? ganchoPadrao).join('\n'));
  const [rotulo, setRotulo] = useState(ou(gravada.topicLabel, 'AULA PRÁTICA'));
  const [assunto, setAssunto] = useState(ou(gravada.topicStrong, assuntoPadrao));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const g = criativo.capa || {};
    setCurso(g.courseKey || 'white-belt');
    setSerie(ou(g.seriesLabel, 'WHITE BELT'));
    setEpisodio(ou(g.episode, String(criativo.ordem || 1).padStart(2, '0')));
    setGancho((g.hookLines ?? ganchoDoTitulo(criativo.titulo)).join('\n'));
    setRotulo(ou(g.topicLabel, 'AULA PRÁTICA'));
    setAssunto(ou(g.topicStrong, (video?.serie || video?.curso || 'MELHORIA CONTÍNUA').toUpperCase()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criativo.id, criativo.capa, criativo.titulo, video?.serie]);

  const linhas = gancho.split('\n').map((l) => l.trim()).filter(Boolean);
  const palavras = linhas.join(' ').split(/\s+/).filter(Boolean).length;
  // Só um aviso. O botão não trava por isso.
  const ganchoNoPadrao = palavras >= 3 && palavras <= 6 && linhas.length <= 3;

  /**
   * Salva o texto da capa e manda desenhar só ela.
   *
   * SÓ A CAPA, e não o Reel inteiro: trocar uma palavra do gancho não pode custar
   * um minuto de renderização e o download do trecho de novo. Do vídeo sai apenas
   * um quadro para o retrato; o resto é desenho.
   */
  async function salvarERefazer() {
    setSalvando(true);
    setErro('');
    try {
      await updateDoc(doc(db, COLECOES.criativos, criativo.id), {
        capa: {
          courseKey: curso,
          seriesLabel: serie.trim().toUpperCase(),
          // Apagado fica vazio. Antes o vazio virava "00" aqui mesmo.
          episode: episodio.replace(/\D/g, '').slice(-3),
          hookLines: linhas.map((l) => l.toUpperCase()),
          topicLabel: rotulo.trim().toUpperCase(),
          topicStrong: assunto.trim().toUpperCase(),
        },
        atualizadoEm: new Date().toISOString(),
      });

      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';
      const r = await fetch('/api/marketing-consultor/gerar-capa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ criativoId: criativo.id }),
      });
      if (!r.ok) {
        const corpo = await r.json().catch(() => ({}));
        throw new Error(corpo.error || `HTTP ${r.status}`);
      }
      onRefeita?.();
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setSalvando(false);
    }
  }

  const campo = 'w-full px-2 py-1.5 rounded border border-gray-300 text-sm';

  return (
    <div className="space-y-2.5">
      <p className="text-sm font-semibold text-gray-800">Texto da capa</p>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase text-gray-400">Gancho — o texto grande</span>
          <span className={`text-[10px] font-bold ${ganchoNoPadrao ? 'text-gray-400' : 'text-amber-600'}`}>
            {palavras} palavras · {linhas.length} linhas
          </span>
        </div>
        <textarea
          value={gancho}
          onChange={(e) => setGancho(e.target.value)}
          rows={3}
          className={`${campo} font-bold resize-y`}
        />
        <p className="text-[10px] text-gray-500">
          Uma linha por linha da capa. Recomendado de 3 a 6 palavras, que é o que se lê numa
          miniatura — mas não é obrigatório: pode deixar em branco ou escrever mais, o texto encolhe para caber.
        </p>
      </div>

      <div className="flex gap-2">
        <label className="flex-1 min-w-0">
          <span className="block text-[10px] font-bold uppercase text-gray-400">Série</span>
          <input value={serie} onChange={(e) => setSerie(e.target.value)} className={campo} />
        </label>
        <label className="w-20">
          <span className="block text-[10px] font-bold uppercase text-gray-400">Episódio</span>
          <input value={episodio} onChange={(e) => setEpisodio(e.target.value)} className={campo} />
        </label>
      </div>

      <div className="flex gap-2">
        <label className="flex-1 min-w-0">
          <span className="block text-[10px] font-bold uppercase text-gray-400">Rótulo do rodapé</span>
          <input value={rotulo} onChange={(e) => setRotulo(e.target.value)} className={campo} />
        </label>
        <label className="flex-1 min-w-0">
          <span className="block text-[10px] font-bold uppercase text-gray-400">Assunto</span>
          <input value={assunto} onChange={(e) => setAssunto(e.target.value)} className={campo} />
        </label>
      </div>

      <label className="block">
        <span className="block text-[10px] font-bold uppercase text-gray-400">Curso — define as cores</span>
        <select
          value={curso}
          onChange={(e) => setCurso(e.target.value as typeof curso)}
          className={`${campo} bg-white`}
        >
          {CURSOS.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={salvarERefazer}
          disabled={salvando || refazendo}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          {salvando || refazendo
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Refazendo a capa…</>
            : <><RefreshCw className="w-3.5 h-3.5" /> Refazer a capa</>}
        </button>
        <span className="text-[11px] text-gray-500">
          Refaz só a imagem da capa, em segundos. O vídeo não é cortado de novo.
        </span>
      </div>
      {erro && <p className="text-sm text-red-700">{erro}</p>}
    </div>
  );
}

/**
 * O gancho da capa a partir do título — a MESMA conta do servidor.
 *
 * Está repetida aqui porque a tela precisa mostrar o valor efetivo antes de o
 * servidor calcular. Se uma mudar, a outra tem de mudar junto; é o preço de a tela
 * poder dizer a verdade sobre o que vai sair.
 */
function ganchoDoTitulo(titulo: string): string[] {
  const palavras = String(titulo || '').trim().split(/\s+/).filter(Boolean).slice(0, 6);
  if (!palavras.length) return [];
  const texto = palavras.join(' ').toUpperCase();
  if (palavras.length < 2) return [texto];
  const metade = Math.ceil(texto.length / 2);
  let usado = 0;
  let corte = 1;
  for (let i = 0; i < palavras.length - 1; i++) {
    usado += palavras[i].length + 1;
    if (usado >= metade) { corte = i + 1; break; }
    corte = i + 2;
  }
  const lista = texto.split(' ');
  return [lista.slice(0, corte).join(' '), lista.slice(corte).join(' ')].filter(Boolean);
}

/** Uma imagem do Storage, já resolvida. *//** Uma imagem do Storage, já resolvida. */
function ImagemDoArquivo({ caminho, className }: { caminho: string; className?: string }) {
  const { url, erro } = useArquivoUrl(caminho);
  if (erro) return <span className={`${className} bg-gray-100 block`} />;
  if (!url) return <span className={`${className} bg-gray-100 animate-pulse block`} />;
  return <img src={url} alt="" className={className} />;
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
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-600 text-white text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {peca.status === 'publicado' ? 'Publicada' : 'Aprovada · na Publicação'}
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
