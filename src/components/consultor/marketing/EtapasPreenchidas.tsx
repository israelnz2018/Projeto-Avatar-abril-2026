/**
 * Telas das etapas 2 a 6 do Marketing para Consultores.
 *
 * Nesta entrega são telas de LEITURA: mostram o estado real vindo do Firestore para
 * o consultor ver onde está. As ações (conectar, enviar, gerar, aprovar, agendar)
 * entram nas próximas entregas da fase 1.
 */
import React, { useEffect, useState } from 'react';
import {
  addDoc, collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore';
import {
  Instagram, Linkedin, CheckCircle2, AlertTriangle, Video, Clock,
  FileText, Image as ImageIcon, Film, Layers, Send, Trash2, Loader2,
  ExternalLink, RotateCcw, Rocket,
} from 'lucide-react';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import { diaISO, diasCorridos, segundaDaSemana, somarDias } from '../../../lib/semana';
import {
  FUSOS, FUSO_DA_PUBLICACAO, IdFuso, comoRelogioDe, equivalenteEm, fusoPorId, tzDe,
} from '../../../lib/fuso';
import { auth, db, storage } from '../../../lib/firebase';
import {
  COLECOES, Campanha, ConexaoRede, MarketingConfig, Peca, StatusPeca, TipoPeca, VideoFonte, OBJETIVOS, TIPOS_PECA,
} from '../../../types/marketing';

/* ====================== Etapa 2 — Redes sociais ====================== */

export function EtapaRedes({ config }: { config: MarketingConfig | null }) {
  return (
    <div className="space-y-4">
      <CartaoRede
        nome="Instagram"
        icone={<Instagram className="w-5 h-5" />}
        cor="text-pink-600"
        conexao={config?.instagram}
        exigencia="A conta precisa ser profissional (Business ou Creator). Conta pessoal não publica por API."
      />
      <CartaoRede
        nome="LinkedIn"
        icone={<Linkedin className="w-5 h-5" />}
        cor="text-blue-700"
        conexao={config?.linkedin}
        exigencia="Publica no seu perfil pessoal. Página de empresa exige permissão adicional."
      />
      <p className="text-xs text-gray-500">
        A autorização acontece no site da própria rede. Nenhuma senha ou chave é digitada aqui,
        e o token fica guardado no servidor — nunca no navegador.
      </p>
      <p className="text-xs text-gray-500">
        <strong>Facebook:</strong> quando configurado no servidor, o Reel e o carrossel de
        feed também saem sozinhos na sua Página do Facebook, junto com o Instagram — mesmo
        arquivo, mesma legenda, sem aprovação nem agendamento à parte.
      </p>
      <p className="text-xs text-gray-500">
        <strong>YouTube:</strong> quando configurado, o Reel e o carrossel em vídeo também
        sobem sozinhos como YouTube Shorts — mesma regra: sem aprovação nem agendamento à parte.
      </p>
    </div>
  );
}

function CartaoRede({
  nome, icone, cor, conexao, exigencia,
}: {
  nome: string; icone: React.ReactNode; cor: string; conexao?: ConexaoRede; exigencia: string;
}) {
  const conectado = Boolean(conexao?.conectado);
  const diasRestantes = conexao?.expiraEm
    ? Math.ceil((new Date(conexao.expiraEm).getTime() - Date.now()) / 86400000)
    : null;
  const vencendo = diasRestantes !== null && diasRestantes <= 14;

  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-white">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={cor}>{icone}</span>
          <div>
            <p className="font-bold text-gray-900">{nome}</p>
            {conectado ? (
              <>
                <p className="text-sm text-gray-700">{conexao?.conta}</p>
                {conexao?.tipoConta && <p className="text-xs text-gray-500">{conexao.tipoConta}</p>}
              </>
            ) : (
              <p className="text-sm text-gray-500">Ainda não conectado.</p>
            )}
          </div>
        </div>
        {conectado ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 shrink-0">
            <CheckCircle2 className="w-4 h-4" /> Conectado
          </span>
        ) : (
          <button className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold shrink-0 opacity-50 cursor-not-allowed">
            Conectar
          </button>
        )}
      </div>

      {conectado && diasRestantes !== null && (
        <p className={`text-xs mt-3 flex items-center gap-1.5 ${vencendo ? 'text-amber-700' : 'text-gray-500'}`}>
          <Clock className="w-3.5 h-3.5" />
          A autorização vence em {diasRestantes} dias
          {vencendo && ' — será preciso reconectar.'}
        </p>
      )}
      <p className="text-xs text-gray-500 mt-2">{exigencia}</p>
    </div>
  );
}

/* ====================== Etapa 3 — Meus vídeos ====================== */

export function EtapaVideos({
  videos, criativos = [], onMudou,
}: {
  videos: VideoFonte[];
  /** Só para avisar quantos criativos morrem junto com o vídeo. */
  criativos?: { videoId: string }[];
  /** Recarrega a lista depois de apagar um vídeo ou gerar a transcrição de um. */
  onMudou?: () => void;
}) {
  if (!videos.length) return <Vazio texto="Nenhum vídeo enviado ainda." />;
  return (
    <div className="space-y-3">
      {videos.map((v) => (
        <div key={v.id} className="p-4 rounded-lg border border-gray-200 bg-white flex items-start gap-3">
          <Video className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900">{v.titulo}</p>
            <p className="text-sm text-gray-600">
              {[v.curso, v.serie].filter(Boolean).join(' · ')}
              {v.duracaoSegundos ? ` · ${formatarDuracao(v.duracaoSegundos)}` : ''}
            </p>
            {v.sourceUrl && <p className="text-xs text-gray-500 mt-1 truncate">{v.sourceUrl}</p>}
            {!v.sourceUrl && v.bunnyVideoId && (
              <p className="text-xs text-gray-500 mt-1">Vídeo enviado — hospedado no Bunny.</p>
            )}
          </div>
          {v.temTranscricao
            ? (
              <span className="text-xs font-semibold px-2 py-1 rounded shrink-0 bg-green-100 text-green-800">
                Com transcrição
              </span>
            )
            : <BotaoTranscrever video={v} onPronto={onMudou} />}
          {onMudou && (
            <BotaoApagarVideo
              video={v}
              quantosCriativos={criativos.filter((c) => c.videoId === v.id).length}
              onApagado={onMudou}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Rede de segurança da transcrição.
 *
 * Ela roda sozinha logo depois do upload, mas pode falhar (rede caiu, codificação
 * demorou demais, serviço sem saldo) — e aí o vídeo fica salvo sem ela, sem nada
 * que dê pra clicar. Sem transcrição não há criativo, então este botão precisa
 * existir na lista, e não só dentro do formulário de cadastro.
 */
function BotaoTranscrever({ video, onPronto }: { video: VideoFonte; onPronto?: () => void }) {
  const [pedindo, setPedindo] = useState(false);
  const [erro, setErro] = useState('');

  if (!video.bunnyVideoId) {
    return (
      <span
        title="Vídeo de link externo: a plataforma não consegue transcrever."
        className="text-xs font-semibold px-2 py-1 rounded shrink-0 bg-gray-100 text-gray-600"
      >
        Sem transcrição
      </span>
    );
  }

  // O trabalho roda no servidor e pode ficar órfão se o container reiniciar no meio
  // (deploy, por exemplo). O servidor renova transcricaoIniciadaEm a cada minuto;
  // sem notícia há 5, é trabalho morto e o botão de tentar de novo tem que voltar.
  const desde = Date.parse(video.transcricaoIniciadaEm || '') || 0;
  const travado = desde > 0 && Date.now() - desde > 5 * 60 * 1000;
  const andando = (video.transcricaoStatus === 'processando' || video.transcricaoStatus === 'na-fila') && !travado;

  async function transcrever() {
    setPedindo(true);
    setErro('');
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';
      const r = await fetch('/api/bunny/transcribe-marketing-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ videoId: video.id }),
      });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(corpo.error || `HTTP ${r.status}`);
      onPronto?.();
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setPedindo(false);
    }
  }

  if (andando) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
        <Loader2 className="w-3 h-3 animate-spin" />
        {video.transcricaoStatus === 'na-fila' ? 'Na fila' : 'Transcrevendo…'}
      </span>
    );
  }

  return (
    <div className="shrink-0 text-right max-w-[220px]">
      <button
        onClick={transcrever}
        disabled={pedindo}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-60"
      >
        {pedindo
          ? <><Loader2 className="w-3 h-3 animate-spin" /> Pedindo…</>
          : travado
            ? <>Transcrição travou — tentar de novo</>
            : <>Sem transcrição — gerar</>}
      </button>
      {(erro || video.transcricaoErro) && (
        <p className="text-[10px] text-red-600 mt-1">{erro || video.transcricaoErro}</p>
      )}
    </div>
  );
}

/**
 * Apagar o vídeo apaga junto os criativos que saíram dele — deixá-los órfãos só
 * encheria a próxima etapa de trechos que não dá mais pra rever no vídeo de origem.
 * O arquivo no Bunny continua lá: quem apaga mídia é o dono dela, não esta tela.
 */
function BotaoApagarVideo({
  video, quantosCriativos, onApagado,
}: {
  video: VideoFonte;
  quantosCriativos: number;
  onApagado: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [apagando, setApagando] = useState(false);

  async function apagar() {
    setApagando(true);
    try {
      const doVideo = await getDocs(query(
        collection(db, COLECOES.criativos),
        where('videoId', '==', video.id),
      ));
      await Promise.all(doVideo.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, COLECOES.videos, video.id));
      onApagado();
    } finally {
      setApagando(false);
      setConfirmando(false);
    }
  }

  if (!confirmando) {
    return (
      <button
        onClick={() => setConfirmando(true)}
        title="Apagar vídeo"
        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="text-xs text-red-700 font-semibold">
        {quantosCriativos > 0 ? `Apaga ${quantosCriativos} criativo${quantosCriativos === 1 ? '' : 's'}.` : 'Apagar?'}
      </span>
      <button
        onClick={apagar}
        disabled={apagando}
        className="px-2 py-1 rounded bg-red-600 text-white text-xs font-bold disabled:opacity-60"
      >
        {apagando ? '…' : 'Apagar'}
      </button>
      <button onClick={() => setConfirmando(false)} className="px-2 py-1 text-xs font-semibold text-gray-600">
        Não
      </button>
    </div>
  );
}

/* ====================== Etapa 4 — Campanhas ====================== */

export function EtapaCampanhas({ campanhas, pecas }: { campanhas: Campanha[]; pecas: Peca[] }) {
  if (!campanhas.length) return <Vazio texto="Nenhuma campanha criada ainda." />;
  return (
    <div className="space-y-3">
      {campanhas.map((c) => {
        const doCampanha = pecas.filter((p) => p.campanhaId === c.id);
        const objetivo = OBJETIVOS.find((o) => o.id === c.objetivo);
        return (
          <div key={c.id} className="p-4 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-gray-900">{c.titulo}</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  {objetivo?.nome}
                  {c.corteInicio && ` · trecho ${c.corteInicio} a ${c.corteFim}`}
                </p>
              </div>
              <EtiquetaStatus status={c.status} />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {doCampanha.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-700">
                  {iconePeca(p.tipo)} {nomePeca(p.tipo)}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ====================== Etapa 5 — Revisão ====================== */

/**
 * O endereço navegável de um arquivo do Storage.
 *
 * Estava repetido dentro da Previa, da Miniatura e do LinkDoArquivo, cada um com
 * a sua versão. Agora as telas que mostram peça pedem aqui.
 *
 * Devolve `{ url, erro, carregando }` — quem chama decide o que mostrar em cada
 * caso, porque um PDF que não carrega e uma miniatura que não carrega merecem
 * tratamentos diferentes.
 */
export function useArquivoUrl(caminho?: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!caminho || !caminho.startsWith('marketing/')) { setUrl(null); setErro(false); return; }
    let vivo = true;
    setUrl(null);
    setErro(false);
    getDownloadURL(storageRef(storage, caminho))
      .then((u) => { if (vivo) setUrl(u); })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, [caminho]);

  return { url, erro, carregando: Boolean(caminho) && !url && !erro };
}

export function Previa({ caminho }: { caminho?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!caminho) return;
    let vivo = true;
    setUrl(null);
    setErro(false);
    getDownloadURL(storageRef(storage, caminho))
      .then((u) => { if (vivo) setUrl(u); })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, [caminho]);

  if (!caminho) return null;

  // Peça antiga, produzida direto na máquina antes da fila existir: o arquivo nunca
  // subiu para a nuvem, então não há o que mostrar aqui.
  if (!caminho.startsWith('marketing/')) {
    return (
      <p className="mt-3 text-xs text-gray-500 italic">
        Gerada na máquina, fora da plataforma. O arquivo está em {caminho}.
      </p>
    );
  }

  if (erro) {
    return (
      <p className="mt-3 text-xs text-gray-500 italic">
        Não foi possível carregar a prévia deste arquivo.
      </p>
    );
  }

  if (!url) return <div className="mt-3 h-48 w-48 rounded-lg bg-gray-100 animate-pulse" />;

  if (/\.pdf$/i.test(caminho)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        <FileText className="w-4 h-4" /> Abrir o PDF
      </a>
    );
  }

  // .mov é o vídeo que sai do iPhone, e é aceito no envio de peça pronta.
  if (/\.(mp4|mov)$/i.test(caminho)) {
    return <video src={url} controls className="mt-3 rounded-lg border border-gray-200 max-h-80" />;
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="block mt-3 w-fit">
      <img
        src={url}
        alt="Prévia da peça"
        className="rounded-lg border border-gray-200 max-h-80 object-contain bg-gray-50"
      />
    </a>
  );
}

/**
 * Miniaturas dos demais arquivos da peça — os outros slides, a legenda, a capa.
 *
 * Exportado porque quem revisa a peça é a etapa 4: a prévia mostra um slide só, e
 * sem isto o consultor não consegue ver o carrossel inteiro antes de aprovar.
 */
export function Anexos({ peca }: { peca: Peca }) {
  const outros = (peca.arquivos || [])
    .filter((c) => c !== peca.arquivoUrl && c.startsWith('marketing/'));
  if (!outros.length) return null;
  return (
    <details className="mt-3">
      <summary className="text-xs font-semibold text-gray-600 cursor-pointer">
        Ver os outros {outros.length} arquivos desta peça
      </summary>
      <div className="flex flex-wrap gap-2 mt-2">
        {outros.map((c) => <Miniatura key={c} caminho={c} />)}
      </div>
    </details>
  );
}

function Miniatura({ caminho }: { caminho: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const nome = caminho.split('/').pop() || caminho;
  const ehImagem = /\.(png|jpe?g)$/i.test(caminho);

  useEffect(() => {
    let vivo = true;
    getDownloadURL(storageRef(storage, caminho))
      .then((u) => { if (vivo) setUrl(u); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [caminho]);

  if (!url) return <div className="w-20 h-28 rounded bg-gray-100 animate-pulse" />;

  return (
    <a href={url} target="_blank" rel="noreferrer" title={nome}>
      {ehImagem
        ? <img src={url} alt={nome} className="w-20 h-28 object-cover rounded border border-gray-200" />
        : (
          <span className="w-20 h-28 rounded border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1 text-[10px] text-gray-600 px-1 text-center">
            <FileText className="w-4 h-4" />
            <span className="truncate w-full">{nome}</span>
          </span>
        )}
    </a>
  );
}

/* ====================== Etapa 5 — Publicação ====================== */

/**
 * As cores do calendário, uma por tipo de peça.
 *
 * A cor é o que faz a semana ser lida de relance: sem ela, sete dias de retângulos
 * cinzentos não dizem se a semana está equilibrada entre Instagram e LinkedIn.
 */
const CORES_PECA: Record<TipoPeca, { chip: string; ponto: string }> = {
  'carrossel-feed': { chip: 'bg-green-100 border-green-400 text-green-900', ponto: 'bg-green-500' },
  'carrossel-video': { chip: 'bg-amber-100 border-amber-400 text-amber-900', ponto: 'bg-amber-500' },
  'linkedin-pdf': { chip: 'bg-sky-100 border-sky-400 text-sky-900', ponto: 'bg-sky-500' },
  'linkedin-imagem': { chip: 'bg-indigo-100 border-indigo-400 text-indigo-900', ponto: 'bg-indigo-500' },
  'linkedin-texto': { chip: 'bg-violet-100 border-violet-400 text-violet-900', ponto: 'bg-violet-500' },
  reel: { chip: 'bg-fuchsia-100 border-fuchsia-400 text-fuchsia-900', ponto: 'bg-fuchsia-500' },
};

/**
 * A hora que a peça recebe ao cair no calendário.
 *
 * São os horários de maior alcance de cada rede, não um palpite: no Instagram a
 * audiência brasileira está no almoço e no fim da tarde; no LinkedIn, no começo do
 * expediente. É só um ponto de partida — a hora se muda clicando na peça.
 */
const HORA_SUGERIDA: Record<TipoPeca, string> = {
  reel: '19:00',
  'carrossel-feed': '12:00',
  'carrossel-video': '19:00',
  'linkedin-pdf': '08:00',
  'linkedin-imagem': '08:00',
  'linkedin-texto': '08:00',
};

const DIAS_DA_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function EtapaAgenda({
  pecas, campanhas, onMudou,
}: {
  pecas: Peca[];
  campanhas: Campanha[];
  onMudou?: () => void;
}) {
  // Em que relógio o consultor quer LER as horas. Não muda o que é gravado: o
  // calendário é sempre o do Brasil, porque é lá que o post sai. Ver src/lib/fuso.ts.
  const [fuso, setFuso] = useState<IdFuso>(() => fusoGuardado());
  const [inicio, setInicio] = useState(() => segundaDaSemana(hojeNoBrasil()));
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [agendamentoPendente, setAgendamentoPendente] = useState<{ peca: Peca; dia: Date } | null>(null);
  const [agendamentoConfirmado, setAgendamentoConfirmado] = useState('');

  // Os filtros. Vazio quer dizer TODOS — filtro que começa escondendo tudo faz
  // o consultor achar que perdeu o trabalho.
  const [redes, setRedes] = useState<Set<string>>(new Set());
  const [situacoes, setSituacoes] = useState<Set<SituacaoPeca>>(new Set());
  const [busca, setBusca] = useState('');
  // Um vídeo longo rende dezenas de criativos, e cada criativo rende cinco peças.
  // Em calendário isso é ilegível; a lista é onde se enxerga volume.
  const [modo, setModo] = useState<'calendario' | 'lista'>('calendario');
  const [assuntoAberto, setAssuntoAberto] = useState<string | null>(null);
  // Quantas semanas à vista. Quatro (28 dias) é o padrão: o consultor planeja
  // por mês, e uma semana só obrigava a navegar para ver o que vinha depois.
  const [semanas, setSemanas] = useState(4);

  const dias = diasCorridos(inicio, semanas);
  // "Hoje" era o dia do NAVEGADOR — ou seja, o da Nova Zelândia. Passava boa parte
  // do dia marcando de azul um dia que no Brasil ainda não havia começado.
  const hoje = diaISO(hojeNoBrasil());

  const tituloDe = (p: Peca) => campanhas.find((c) => c.id === p.campanhaId)?.titulo || '';

  /**
   * O ASSUNTO de uma peça é o criativo de onde ela saiu.
   *
   * Um criativo gera duas campanhas (as peças de texto e o Reel) e cinco peças no
   * total. Agrupar por campanha partiria o conjunto em dois; por criativo, as
   * cinco ficam juntas — que é como o consultor pensa nelas.
   */
  const assuntoDe = (p: Peca) => {
    const campanha = campanhas.find((c) => c.id === p.campanhaId);
    return campanha?.criativoId || p.campanhaId;
  };

  // Só peça aprovada entra no calendário: marcar a publicação de algo que ainda
  // está em revisão seria agendar uma peça que ainda pode mudar.
  const aprovadas = pecas.filter((p) => p.status === 'aprovado' || p.status === 'publicado');

  const termo = busca.trim().toLowerCase();
  const combina = (p: Peca) => {
    if (redes.size && ![...redes].some((rede) => pecaVaiParaRede(p, rede))) return false;
    if (situacoes.size && !situacoes.has(situacaoDaPeca(p))) return false;
    if (termo && !`${nomePeca(p.tipo)} ${tituloDe(p)}`.toLowerCase().includes(termo)) return false;
    return true;
  };

  const visiveis = aprovadas.filter(combina);
  const naFila = visiveis.filter((p) => situacaoDaPeca(p) === 'fila');
  // Peça com data continua no calendário mesmo se falhou — é no dia dela que o
  // consultor vai procurar para entender o que aconteceu.
  const agendadas = visiveis.filter((p) => p.agendadoEm);

  // O histórico. Responde "o que já foi publicado e o que ainda falta" sem
  // obrigar o consultor a caçar peça por peça no calendário.
  const publicadas = visiveis
    .filter((p) => jaPublicada(p))
    .sort((a, b) => quandoPublicou(b).localeCompare(quandoPublicou(a)));

  const assuntosNaFila = agruparPorAssunto(naFila, assuntoDe, tituloDe);
  const filtrando = redes.size > 0 || situacoes.size > 0 || termo.length > 0;

  function alternar<T>(conjunto: Set<T>, valor: T, definir: (s: Set<T>) => void) {
    const novo = new Set(conjunto);
    if (novo.has(valor)) novo.delete(valor);
    else novo.add(valor);
    definir(novo);
  }

  async function escrever(pecaId: string, dados: Record<string, unknown>): Promise<boolean> {
    setSalvando(true);
    setErro('');
    try {
      await updateDoc(doc(db, COLECOES.pecas, pecaId), { ...dados, atualizadoEm: new Date().toISOString() });
      onMudou?.();
      return true;
    } catch (e: any) {
      setErro(e?.message || String(e));
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function agendar(peca: Peca, dia: Date): Promise<boolean> {
    setSelecionada(null);
    const ok = await escrever(peca.id, {
      agendadoEm: diaISO(dia),
      agendadoHora: peca.agendadoHora || HORA_SUGERIDA[peca.tipo] || '12:00',
    });
    if (ok) {
      setAgendamentoPendente(null);
      setAgendamentoConfirmado(`${nomePeca(peca.tipo)} agendada para ${dia.toLocaleDateString('pt-BR')}.`);
    }
    return ok;
  }

  function prepararAgendamento(peca: Peca, dia: Date) {
    setErro('');
    setAgendamentoConfirmado('');
    setAgendamentoPendente({ peca, dia });
  }

  function tirarDoCalendario(peca: Peca) {
    setAberta(null);
    return escrever(peca.id, { agendadoEm: deleteField(), agendadoHora: deleteField() });
  }

  /** Largar uma peça num dia, vinda da fila ou de outro dia. */
  function aoLargar(dia: Date) {
    return (ev: React.DragEvent) => {
      ev.preventDefault();
      const id = ev.dataTransfer.getData('text/plain');
      const peca = aprovadas.find((p) => p.id === id);
      if (peca) prepararAgendamento(peca, dia);
    };
  }

  /**
   * Clicar num dia com uma peça selecionada também agenda.
   *
   * Arrastar não pode ser o único caminho: no toque ele não existe, e um calendário
   * que só funciona com mouse deixa metade dos casos de fora.
   */
  function aoClicarNoDia(dia: Date) {
    if (!selecionada) return;
    const peca = aprovadas.find((p) => p.id === selecionada);
    if (peca) prepararAgendamento(peca, dia);
  }

  async function confirmarAgendamento() {
    if (!agendamentoPendente) return;
    await agendar(agendamentoPendente.peca, agendamentoPendente.dia);
  }

  const fim = somarDias(inicio, semanas * 7 - 1);
  const rotuloSemana = inicio.getMonth() === fim.getMonth()
    ? `${inicio.getDate()} a ${fim.getDate()} de ${inicio.toLocaleDateString('pt-BR', { month: 'long' })}`
    : `${inicio.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} a ${fim.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;

  const daSemana = agendadas
    .filter((p) => dias.some((d) => diaISO(d) === p.agendadoEm))
    .sort((a, b) => `${a.agendadoEm}${a.agendadoHora || ''}`.localeCompare(`${b.agendadoEm}${b.agendadoHora || ''}`));

  return (
    <div className="space-y-4">
      {/* ── Resumo e filtros: a porta de entrada da etapa ── */}
      <section className="p-4 rounded-lg border border-gray-200 bg-white space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <Contagem numero={aprovadas.filter((p) => situacaoDaPeca(p) === 'fila').length} rotulo="na fila" />
            <Contagem numero={aprovadas.filter((p) => situacaoDaPeca(p) === 'agendada').length} rotulo="agendadas" />
            <Contagem numero={aprovadas.filter((p) => jaPublicada(p)).length} rotulo="publicadas" cor="text-green-700" />
            {aprovadas.some((p) => situacaoDaPeca(p) === 'falhou') && (
              <Contagem
                numero={aprovadas.filter((p) => situacaoDaPeca(p) === 'falhou').length}
                rotulo="não saíram"
                cor="text-red-700"
              />
            )}
          </div>
          <span className="flex items-center gap-2">
            {salvando && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            <span className="inline-flex items-center rounded-lg border border-gray-300 overflow-hidden">
              {([['calendario', 'Calendário'], ['lista', 'Lista']] as const).map(([id, nome]) => (
                <button
                  key={id}
                  onClick={() => setModo(id)}
                  className={`px-3 py-1 text-[11px] font-bold ${
                    modo === id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {nome}
                </button>
              ))}
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {REDES.map((r) => (
            <Chip key={r.id} ativo={redes.has(r.id)} onClick={() => alternar(redes, r.id, setRedes)}>
              {r.nome}
            </Chip>
          ))}
          <span className="w-px h-5 bg-gray-200" />
          {SITUACOES.map((s) => (
            <Chip
              key={s.id}
              ativo={situacoes.has(s.id)}
              onClick={() => alternar(situacoes, s.id, setSituacoes)}
            >
              {s.nome}
            </Chip>
          ))}
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por assunto…"
            className="flex-1 min-w-[160px] px-2.5 py-1 rounded-lg border border-gray-300 text-xs"
          />
          {filtrando && (
            <button
              onClick={() => { setRedes(new Set()); setSituacoes(new Set()); setBusca(''); }}
              className="text-[11px] font-bold text-blue-700 hover:underline"
            >
              limpar
            </button>
          )}
        </div>
      </section>

      {/* ── A fila, agrupada por assunto ── */}
      <section className="p-4 rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h3 className="text-sm font-bold text-gray-900">
            Aprovadas, sem dia marcado ({naFila.length})
          </h3>
        </div>
        <p className="text-xs text-gray-600 mb-3">
          Cada linha é um assunto, com as peças que saíram dele. Abra o assunto e
          arraste a peça para o dia — ou clique nela e depois no dia.
        </p>
        {naFila.length === 0
          ? (
            <Vazio texto={filtrando
              ? 'Nenhuma peça na fila com estes filtros.'
              : 'Nada esperando. Tudo que você aprovou já tem dia.'}
            />
          )
          : (
            <div className="space-y-1.5">
              {assuntosNaFila.map((grupo) => {
                const aberto = assuntoAberto === grupo.chave || assuntosNaFila.length === 1;
                return (
                  <div key={grupo.chave} className="rounded-lg border border-gray-200">
                    <button
                      onClick={() => setAssuntoAberto(aberto ? null : grupo.chave)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-gray-400 text-xs shrink-0">{aberto ? '▾' : '▸'}</span>
                        <span className="text-sm font-semibold text-gray-900 truncate">{grupo.titulo}</span>
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {/* As bolinhas dizem quais dos cinco formatos ainda faltam
                            colocar no calendário, sem precisar abrir o assunto. */}
                        {grupo.pecas.map((p) => (
                          <span
                            key={p.id}
                            title={nomePeca(p.tipo)}
                            className={`w-2.5 h-2.5 rounded-sm ${CORES_PECA[p.tipo].ponto}`}
                          />
                        ))}
                        <span className="text-xs font-bold text-gray-500 ml-1">{grupo.pecas.length}</span>
                      </span>
                    </button>
                    {aberto && (
                      <div className="flex flex-wrap gap-2 px-3 pb-3">
                        {grupo.pecas.map((p) => (
                          <button
                            key={p.id}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
                            onClick={() => setSelecionada(selecionada === p.id ? null : p.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-grab active:cursor-grabbing ${CORES_PECA[p.tipo].chip}${selecionada === p.id ? ' ring-2 ring-offset-1 ring-blue-500' : ''}`}
                          >
                            {iconePeca(p.tipo)}
                            <span className="max-w-[200px] truncate">{nomePeca(p.tipo)}</span>
                            {/* Reprise na fila precisa se identificar, senão parece
                                peça nova e o consultor agenda o mesmo post duas vezes. */}
                            {p.reprise && p.reprise > 1 && (
                              <span className="px-1 rounded bg-white/70 text-[10px] font-bold">
                                {p.reprise}ª
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        {selecionada && (
          <p className="text-xs font-semibold text-blue-700 mt-2">
            Agora clique no dia em que ela vai ao ar.
          </p>
        )}
      </section>

      {/* ── A semana ── */}
      {modo === 'calendario' && (
      <section className="p-4 rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setInicio(somarDias(inicio, -7 * semanas))}
              title="Período anterior"
              className="px-2.5 py-1 rounded border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              ‹
            </button>
            <button
              onClick={() => setInicio(segundaDaSemana(hojeNoBrasil()))}
              className="px-2.5 py-1 rounded border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Hoje
            </button>
            <button
              onClick={() => setInicio(somarDias(inicio, 7 * semanas))}
              title="Próximo período"
              className="px-2.5 py-1 rounded border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              ›
            </button>
            {/* Quantas semanas de uma vez. Quatro é o mês à vista, na mesma
                grade de sete colunas — só com mais linhas. */}
            <span className="inline-flex items-center rounded-lg border border-gray-300 overflow-hidden ml-1">
              {[1, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setSemanas(n)}
                  title={`Ver ${n * 7} dias`}
                  className={`px-2.5 py-1 text-[11px] font-bold ${
                    semanas === n ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {n * 7}d
                </button>
              ))}
            </span>
          </div>
          <span className="text-sm font-bold text-gray-900 capitalize">{rotuloSemana}</span>
          <div className="flex flex-wrap items-center gap-2.5">
            <EscolherFuso
              fuso={fuso}
              aoTrocar={(f) => { setFuso(f); guardarFuso(f); }}
            />
            {TIPOS_PECA.map((t) => (
              <span key={t.id} className="flex items-center gap-1 text-[11px] text-gray-600">
                <span className={`w-2.5 h-2.5 rounded-sm ${CORES_PECA[t.id].ponto}`} />
                {t.nome}
              </span>
            ))}
            <span className="text-[11px] text-gray-400">|</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-600">
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">Facebook</span>
              automático para peças do Instagram
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-600">
              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-bold">YouTube Shorts</span>
              automático para vídeos
            </span>
          </div>
        </div>

        {/* De quem é este calendário. Sem dizer isto, o consultor na Nova Zelândia
            não tem como saber se a segunda que ele está vendo é a dele ou a do
            público — e as duas quase nunca são o mesmo dia. */}
        <p className="text-xs text-gray-600 mb-2.5">
          Os dias e as horas são do <strong>Brasil</strong> — é lá que o post sai.
          {fuso === FUSO_DA_PUBLICACAO
            ? ' Embaixo de cada peça está a mesma hora no seu relógio da Nova Zelândia.'
            : ` Você está lendo as horas em ${fusoPorId(fuso).nome}; embaixo de cada peça está a hora real da publicação, no Brasil.`}
        </p>

        {/* Com quatro linhas, repetir o dia da semana em cada célula é ruído.
            O cabeçalho sai uma vez, em cima das colunas. */}
        {agendamentoPendente && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
            <p className="text-xs text-blue-900">
              <strong>{nomePeca(agendamentoPendente.peca.tipo)}</strong> foi colocado em{' '}
              <strong>{agendamentoPendente.dia.toLocaleDateString('pt-BR')}</strong>. Confirme para salvar o agendamento.
            </p>
            <span className="flex items-center gap-2 shrink-0">
              <button
                onClick={confirmarAgendamento}
                disabled={salvando}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-60"
              >
                {salvando ? 'Salvando...' : 'Confirmar agendamento'}
              </button>
              <button
                onClick={() => { setAgendamentoPendente(null); setSelecionada(null); }}
                disabled={salvando}
                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 disabled:opacity-60"
              >
                Cancelar
              </button>
            </span>
          </div>
        )}
        {agendamentoConfirmado && (
          <p className="mb-3 inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-bold text-green-800">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            {agendamentoConfirmado}
          </p>
        )}

        <div className="grid grid-cols-7 gap-1.5 mb-1">
          {DIAS_DA_SEMANA.map((nome) => (
            <span key={nome} className="text-[10px] font-bold uppercase text-gray-400 px-0.5">
              {nome}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {dias.map((d) => {
            const chave = diaISO(d);
            const doDia = agendadas
              .filter((p) => p.agendadoEm === chave)
              .sort((a, b) => (a.agendadoHora || '').localeCompare(b.agendadoHora || ''));
            const ehHoje = chave === hoje;
            // Primeiro dia do mês: mostra o mês junto, senão em 28 dias o
            // consultor perde de vista onde a virada aconteceu.
            const viradaDeMes = d.getDate() === 1;
            return (
              <div
                key={chave}
                onDragOver={(e) => e.preventDefault()}
                onDrop={aoLargar(d)}
                onClick={() => aoClicarNoDia(d)}
                className={`${semanas === 1 ? 'min-h-[150px]' : 'min-h-[104px]'} rounded-lg border p-1.5 transition-colors ${
                  ehHoje ? 'border-blue-400 bg-blue-50/40 ' : 'border-gray-200 bg-gray-50/60 '
                }${selecionada ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-300' : ''}`}
              >
                <div className="flex items-baseline justify-end gap-1 px-0.5 mb-1">
                  {viradaDeMes && (
                    <span className="text-[10px] font-bold uppercase text-gray-400 mr-auto">
                      {d.toLocaleDateString('pt-BR', { month: 'short' })}
                    </span>
                  )}
                  <span className={`text-xs font-bold ${ehHoje ? 'text-blue-700' : 'text-gray-600'}`}>
                    {d.getDate()}
                  </span>
                </div>

                <div className="space-y-1">
                  {doDia.map((p) => (
                    <div key={p.id}>
                      <button
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
                        onClick={(e) => { e.stopPropagation(); setAberta(aberta === p.id ? null : p.id); }}
                        className={`w-full text-left px-1.5 py-1 rounded border text-[11px] cursor-grab active:cursor-grabbing ${CORES_PECA[p.tipo].chip}`}
                      >
                        <span className="block font-bold">
                          {horaNoRelogio(p, fuso)}
                          {/* O ✓ no próprio chip: a semana inteira se lê de um olhar. */}
                          {jaPublicada(p) && (
                            <span className="inline-flex items-center gap-1" title="Enviada para a mídia principal">
                              <span className="inline-block h-2 w-2 rounded-full bg-green-500 align-middle" />
                              <span>✓</span>
                            </span>
                          )}
                        </span>
                        {/* A mesma hora no outro relógio: 19h de segunda no Brasil é
                            terça de manhã na Nova Zelândia, e sem isto o consultor
                            acha que a peça sai enquanto ele está acordado. */}
                        {horaNoOutroRelogio(p, fuso) && (
                          <span className="block truncate text-[10px] opacity-70">
                            {horaNoOutroRelogio(p, fuso)}
                          </span>
                        )}
                        <span className="block truncate font-semibold">{nomePeca(p.tipo)}</span>
                        <span className="block truncate opacity-80">{tituloDe(p)}</span>
                        <DestinosAutomaticos peca={p} compacto />
                      </button>

                      {/* Mexer na peça já marcada: a hora e o tirar do calendário. */}
                      {aberta === p.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 p-1.5 rounded border border-gray-300 bg-white space-y-1.5"
                        >
                          <label className="block text-[10px] font-bold uppercase text-gray-500">Hora</label>
                          <input
                            type="time"
                            value={p.agendadoHora || ''}
                            onChange={(e) => escrever(p.id, { agendadoHora: e.target.value })}
                            className="w-full px-1 py-0.5 rounded border border-gray-300 text-[11px]"
                          />
                          {!jaPublicada(p) && !p.pausada && (
                            <BotaoPublicarAgora peca={p} onMudou={onMudou} miudo />
                          )}
                          {!jaPublicada(p) && (
                            <button
                              onClick={() => escrever(p.id, { pausada: !p.pausada })}
                              className={`w-full px-1 py-0.5 rounded border text-[10px] font-bold ${
                                p.pausada
                                  ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {p.pausada ? 'Retomar' : 'Pausar'}
                            </button>
                          )}
                          <button
                            onClick={() => tirarDoCalendario(p)}
                            className="w-full px-1 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold hover:bg-red-100"
                          >
                            Tirar do calendário
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {erro && <p className="text-sm text-red-700 mt-2">{erro}</p>}
      </section>
      )}

      {/* ── Modo lista: onde volume se enxerga ── */}
      {modo === 'lista' && (
        <ListaDePecas
          pecas={visiveis}
          fuso={fuso}
          tituloDe={tituloDe}
          onMudou={onMudou}
        />
      )}

      {/* ── A semana em lista, com o arquivo de cada peça ── */}
      {modo === 'calendario' && (
      <section className="p-4 rounded-lg border border-gray-200 bg-white">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Nesta semana ({daSemana.length})</h3>
        <p className="text-xs text-gray-600 mb-3">
          Chegada a hora marcada, a plataforma publica sozinha — sempre no horário de
          Brasília. Se preferir não esperar, use <strong>Publicar agora</strong>.
        </p>
        {daSemana.length === 0
          ? <Vazio texto="Nenhuma peça marcada para esta semana." />
          : (
            <div className="space-y-2">
              {daSemana.map((p) => (
                <div key={p.id} className="p-2.5 rounded-lg border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-gray-800 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${CORES_PECA[p.tipo].ponto}`} />
                      <strong className="shrink-0" title={horaNoOutroRelogio(p, fuso)}>
                        {fuso === FUSO_DA_PUBLICACAO
                          ? `${new Date(`${p.agendadoEm}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })} ${p.agendadoHora || ''}`
                          : horaNoRelogio(p, fuso)}
                      </strong>
                      <span className="text-xs text-gray-500 shrink-0">
                        {horaNoOutroRelogio(p, fuso)}
                      </span>
                      <span className="truncate">{nomePeca(p.tipo)} — {tituloDe(p)}</span>
                      <DestinosAutomaticos peca={p} />
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <EstadoDaPublicacao peca={p} />
                      <LinkDoArquivo caminho={p.arquivoUrl} />
                    </span>
                  </div>
                  <AcoesDePublicacao peca={p} onMudou={onMudou} />
                </div>
              ))}
            </div>
          )}
      </section>
      )}

      {/* ── O histórico: o que já foi ao ar, com o endereço do post ── */}
      {modo === 'calendario' && (
      <section className="p-4 rounded-lg border border-gray-200 bg-white">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Já publicadas ({publicadas.length})</h3>
        <p className="text-xs text-gray-600 mb-3">
          O link abre o post na rede — é a prova de que saiu.
        </p>
        {publicadas.length === 0
          ? <Vazio texto="Nada publicado ainda." />
          : (
            <div className="space-y-2">
              {publicadas.slice(0, 20).map((p) => (
                <div key={p.id} className="p-2.5 rounded-lg border border-green-200 bg-green-50/40 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-gray-800 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${CORES_PECA[p.tipo].ponto}`} />
                      <strong className="shrink-0">{dataCurta(quandoPublicou(p))}</strong>
                      <span className="truncate">{nomePeca(p.tipo)} — {tituloDe(p)}</span>
                      <DestinosAutomaticos peca={p} />
                      {p.reprise && p.reprise > 1 && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-white border border-gray-300 text-[10px] font-bold text-gray-600">
                          {p.reprise}ª vez
                        </span>
                      )}
                    </span>
                    <EstadoDaPublicacao peca={p} />
                  </div>
                  <AcoesDePublicacao peca={p} onMudou={onMudou} />
                </div>
              ))}
              {publicadas.length > 20 && (
                <p className="text-xs text-gray-500">
                  e mais {publicadas.length - 20} publicadas antes destas.
                </p>
              )}
            </div>
          )}
      </section>
      )}
    </div>
  );
}

/** Um número e o que ele conta. O resumo do topo da etapa. */
function Contagem({ numero, rotulo, cor = 'text-gray-900' }: { numero: number; rotulo: string; cor?: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <strong className={`text-lg font-bold ${cor}`}>{numero}</strong>
      <span className="text-xs text-gray-600">{rotulo}</span>
    </span>
  );
}

/**
 * Todas as peças em lista, ordenadas por data.
 *
 * O calendário é bom para equilibrar uma semana e ruim para encarar volume: um
 * vídeo de uma hora rende dezenas de criativos, e cinco peças cada. A lista
 * mostra cem linhas sem esforço, e é onde se procura uma peça específica.
 *
 * Mostra 30 por vez. O resto aparece com "ver mais" em vez de rolagem infinita,
 * que faz perder o lugar quando a tela recarrega sozinha.
 */
function ListaDePecas({
  pecas, fuso, tituloDe, onMudou,
}: {
  pecas: Peca[];
  fuso: IdFuso;
  tituloDe: (p: Peca) => string;
  onMudou?: () => void;
}) {
  const [quantas, setQuantas] = useState(30);

  // Sem data primeiro — é o que espera decisão. Depois por data, da mais
  // próxima para a mais distante.
  const ordenadas = [...pecas].sort((a, b) => {
    const chave = (p: Peca) => (p.agendadoEm ? `1${p.agendadoEm}${p.agendadoHora || ''}` : '0');
    return chave(a).localeCompare(chave(b));
  });

  if (!ordenadas.length) {
    return (
      <section className="p-4 rounded-lg border border-gray-200 bg-white">
        <Vazio texto="Nenhuma peça com estes filtros." />
      </section>
    );
  }

  return (
    <section className="p-4 rounded-lg border border-gray-200 bg-white">
      <h3 className="text-sm font-bold text-gray-900 mb-3">
        Todas as peças ({ordenadas.length})
      </h3>
      <div className="space-y-1.5">
        {ordenadas.slice(0, quantas).map((p) => (
          <div key={p.id} className="p-2.5 rounded-lg border border-gray-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm text-gray-800 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${CORES_PECA[p.tipo].ponto}`} />
                <strong className="shrink-0 w-24 text-xs">
                  {p.agendadoEm
                    ? (fuso === FUSO_DA_PUBLICACAO
                      ? `${dataCurta(p.agendadoEm)} ${p.agendadoHora || ''}`
                      : horaNoRelogio(p, fuso))
                    : <span className="text-gray-400">sem dia</span>}
                </strong>
                <span className="text-[11px] font-semibold text-gray-500 shrink-0 w-28 truncate">
                  {nomePeca(p.tipo)}
                </span>
                <span className="truncate">{tituloDe(p)}</span>
                <DestinosAutomaticos peca={p} />
                {p.reprise && p.reprise > 1 && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-gray-100 border border-gray-300 text-[10px] font-bold text-gray-600">
                    {p.reprise}ª vez
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <EstadoDaPublicacao peca={p} />
                <LinkDoArquivo caminho={p.arquivoUrl} />
              </span>
            </div>
            <AcoesDePublicacao peca={p} onMudou={onMudou} />
          </div>
        ))}
      </div>
      {ordenadas.length > quantas && (
        <button
          onClick={() => setQuantas((q) => q + 30)}
          className="mt-3 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          Ver mais {Math.min(30, ordenadas.length - quantas)} de {ordenadas.length - quantas}
        </button>
      )}
    </section>
  );
}

/* ====================== Os dois relógios ====================== */

const CHAVE_DO_FUSO = 'lbw_fuso_da_agenda';

/**
 * "Hoje" no fuso em que a peça é publicada.
 *
 * Um Date de exibição: os campos locais dele mostram a data do Brasil, para a
 * conta de semana (que lê getDate/getDay) sair no calendário certo.
 */
function hojeNoBrasil(): Date {
  return comoRelogioDe(new Date(), tzDe(FUSO_DA_PUBLICACAO));
}

/** O relógio escolhido da última vez. Cai no do Brasil, que é o da publicação. */
function fusoGuardado(): IdFuso {
  try {
    const salvo = localStorage.getItem(CHAVE_DO_FUSO);
    if (salvo === 'nz' || salvo === 'brasil') return salvo;
  } catch {
    // Navegador com armazenamento bloqueado: seguir com o padrão, sem quebrar.
  }
  return FUSO_DA_PUBLICACAO;
}

function guardarFuso(id: IdFuso): void {
  try {
    localStorage.setItem(CHAVE_DO_FUSO, id);
  } catch {
    // Preferência de exibição não é dado crítico: perder não custa nada.
  }
}

/**
 * Troca o relógio da leitura.
 *
 * NÃO muda nada no banco, e é por isso que ele existe assim: se o fuso escolhido
 * mudasse o valor gravado, alternar a visão moveria todos os posts agendados de
 * dia. O calendário continua sendo o do Brasil; isto só traduz para a cabeça de
 * quem está na Nova Zelândia.
 */
function EscolherFuso({ fuso, aoTrocar }: { fuso: IdFuso; aoTrocar: (f: IdFuso) => void }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-gray-300 overflow-hidden">
      {FUSOS.map((f) => (
        <button
          key={f.id}
          onClick={() => aoTrocar(f.id)}
          title={`Mostrar as horas no fuso do ${f.nome}`}
          className={`px-2.5 py-1 text-[11px] font-bold ${
            fuso === f.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {f.curto}
        </button>
      ))}
    </span>
  );
}

/**
 * A hora da peça no relógio escolhido.
 *
 * Quando o consultor está lendo em horário da Nova Zelândia, mostra a hora dele
 * em destaque e o dia da semana junto — porque 19h de segunda no Brasil é terça
 * de manhã lá, e sem o dia a hora sozinha engana.
 */
function horaNoRelogio(peca: Peca, fuso: IdFuso): string {
  if (fuso === FUSO_DA_PUBLICACAO) return peca.agendadoHora || '';
  return equivalenteEm(peca.agendadoEm, peca.agendadoHora, fuso) || (peca.agendadoHora || '');
}

/** A mesma hora no outro relógio, para ficar embaixo em letra menor. */
function horaNoOutroRelogio(peca: Peca, fuso: IdFuso): string {
  if (fuso === FUSO_DA_PUBLICACAO) {
    const outro = FUSOS.find((f) => f.id !== FUSO_DA_PUBLICACAO)!;
    const linha = equivalenteEm(peca.agendadoEm, peca.agendadoHora, outro.id);
    return linha ? `${linha} ${outro.curto}` : '';
  }
  return peca.agendadoHora ? `${peca.agendadoHora} BR` : '';
}

/* ====================== Filtros e situação ====================== */

/**
 * Junta as peças por assunto.
 *
 * É o que impede a fila de virar um paredão: um vídeo de uma hora rende dezenas
 * de criativos, cada um com cinco peças. Cem peças soltas são ilegíveis; vinte
 * assuntos com cinco peças dentro, não.
 */
export function agruparPorAssunto(
  pecas: Peca[],
  chaveDe: (p: Peca) => string,
  tituloDe: (p: Peca) => string,
): { chave: string; titulo: string; pecas: Peca[] }[] {
  const grupos = new Map<string, { chave: string; titulo: string; pecas: Peca[] }>();
  for (const peca of pecas) {
    const chave = chaveDe(peca);
    if (!grupos.has(chave)) grupos.set(chave, { chave, titulo: tituloDe(peca) || 'Sem título', pecas: [] });
    grupos.get(chave)!.pecas.push(peca);
  }
  return [...grupos.values()].sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
}

/**
 * Em que pé a peça está, numa palavra.
 *
 * Existe porque a informação estava espalhada em três campos (`status`,
 * `publicacao.status` e `agendadoEm`) e cada trecho da tela combinava do seu
 * jeito. Com 100 peças na mão, filtrar exige um nome só por situação.
 */
export type SituacaoPeca = 'fila' | 'agendada' | 'pausada' | 'publicando' | 'publicada' | 'falhou';

export function situacaoDaPeca(peca: Peca): SituacaoPeca {
  if (jaPublicada(peca)) return 'publicada';
  if (peca.publicacao?.status === 'publicando') return 'publicando';
  // Pausada vem antes de 'falhou' de propósito: pausar uma peça que falhou é o
  // jeito de dizer "para de tentar", e é isso que precisa aparecer na tela.
  if (peca.pausada) return 'pausada';
  if (peca.publicacao?.status === 'falhou') return 'falhou';
  return peca.agendadoEm ? 'agendada' : 'fila';
}

export const SITUACOES: { id: SituacaoPeca; nome: string }[] = [
  { id: 'fila', nome: 'Na fila' },
  { id: 'agendada', nome: 'Agendadas' },
  { id: 'pausada', nome: 'Pausadas' },
  { id: 'publicada', nome: 'Publicadas' },
  { id: 'falhou', nome: 'Não saíram' },
];

/**
 * Quantas semanas o mercado recomenda esperar antes de repetir um conteúdo.
 *
 * A prática de reciclagem de conteúdo evergreen fala em 8 a 10 semanas. Aqui é
 * AVISO, não trava: o consultor sabe quando um assunto voltou a ser notícia, e
 * nada nesta plataforma é obrigatório.
 */
export const SEMANAS_ENTRE_REPRISES = 8;

/** Há quantas semanas esta peça foi publicada. Null quando nunca foi. */
export function semanasDesdePublicacao(peca: Peca): number | null {
  const quando = peca.publicacao?.publicadoEm;
  if (!quando) return null;
  const ms = Date.now() - new Date(quando).getTime();
  return Number.isNaN(ms) ? null : Math.floor(ms / (7 * 86400000));
}

/** Em que rede a peça é publicada. Espelha REDE_DA_PECA do worker. */
export function redeDoTipo(tipo: TipoPeca): 'instagram' | 'linkedin' {
  return tipo.startsWith('linkedin') ? 'linkedin' : 'instagram';
}

export const REDES: { id: 'instagram' | 'linkedin' | 'facebook' | 'youtube'; nome: string }[] = [
  { id: 'instagram', nome: 'Instagram' },
  { id: 'linkedin', nome: 'LinkedIn' },
  { id: 'facebook', nome: 'Facebook' },
  { id: 'youtube', nome: 'YouTube Shorts' },
];

/** Indica se a peça chega a uma rede, inclusive quando é um destino automático. */
export function pecaVaiParaRede(peca: Peca, rede: string): boolean {
  if (rede === 'instagram' || rede === 'linkedin') return redeDoTipo(peca.tipo) === rede;
  return destinosAutomaticos(peca.tipo).some((destino) => (
    rede === 'facebook' ? destino.nome === 'Facebook' : destino.nome === 'YouTube Shorts'
  ));
}

/**
 * Botão de filtro que liga e desliga.
 *
 * Nenhum selecionado significa "todos" — e não "nenhum". Filtro que começa
 * vazio e esconde tudo faz o consultor achar que perdeu o trabalho.
 */
function Chip({
  ativo, onClick, children,
}: {
  ativo: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${
        ativo
          ? 'bg-blue-600 border-blue-600 text-white'
          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

/* ====================== A publicação ====================== */

/** Já foi ao ar? Vale tanto o registro novo quanto o status antigo da peça. */
export function jaPublicada(peca: Peca): boolean {
  return peca.publicacao?.status === 'publicada' || peca.status === 'publicado';
}

/** Quando foi ao ar, para ordenar o histórico. Cai no dia agendado se faltar. */
function quandoPublicou(peca: Peca): string {
  return peca.publicacao?.publicadoEm || peca.agendadoEm || peca.atualizadoEm || '';
}

function dataCurta(iso: string): string {
  if (!iso) return '';
  const data = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(data.getTime())
    ? ''
    : data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

/**
 * O estado da peça na rede, em uma etiqueta.
 *
 * É a resposta a "como sei se publicou olhando para esta tela": verde com link
 * saiu, vermelho com o motivo não saiu, e azul piscando é o Instagram ainda
 * processando o vídeo.
 */
function destinosAutomaticos(tipo: TipoPeca): { nome: string; classe: string }[] {
  if (tipo === 'carrossel-feed') {
    return [{ nome: 'Facebook', classe: 'bg-blue-50 text-blue-700' }];
  }
  if (tipo === 'reel' || tipo === 'carrossel-video') {
    return [
      { nome: 'Facebook', classe: 'bg-blue-50 text-blue-700' },
      { nome: 'YouTube Shorts', classe: 'bg-red-50 text-red-700' },
    ];
  }
  return [];
}

function DestinosAutomaticos({ peca, compacto = false }: { peca: Peca; compacto?: boolean }) {
  const destinos = destinosAutomaticos(peca.tipo);
  if (!destinos.length) return null;

  return (
    <span
      className={`flex flex-wrap items-center gap-1 ${compacto ? 'mt-0.5' : 'shrink-0'}`}
      title="Serão publicados automaticamente junto com o Instagram"
    >
      {destinos.map((destino) => (
        <span
          key={destino.nome}
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${destino.classe}`}
        >
          {destino.nome}
        </span>
      ))}
    </span>
  );
}

/** Mostra o estado da publicação principal na rede. */
function EstadoDaPublicacao({ peca }: { peca: Peca }) {
  const pub = peca.publicacao;

  if (jaPublicada(peca)) {
    const link = pub?.link;
    return (
      <span className="inline-flex items-center gap-1 shrink-0">
        {link
          ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-800 text-xs font-bold hover:bg-green-200"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Publicada
              <ExternalLink className="w-3 h-3" />
            </a>
          )
          : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-800 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Publicada
            </span>
          )}
        {/* Facebook e YouTube não têm estado próprio na tela — são bônus do
            Instagram, sem aprovação nem agendamento à parte. O selo só existe
            para o consultor saber que também saiu, ou que precisa postar à mão. */}
        <SeloExtra rede="Facebook" dados={pub?.facebook} />
        <SeloExtra rede="YouTube" dados={pub?.youtube} />
      </span>
    );
  }

  if (pub?.status === 'publicando') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-bold shrink-0">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Publicando…
      </span>
    );
  }

  if (peca.pausada) {
    return (
      <span
        title="Continua no calendário, mas não vai ao ar até você retomar."
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold shrink-0"
      >
        <Clock className="w-3.5 h-3.5" />
        Pausada
      </span>
    );
  }

  if (pub?.status === 'falhou') {
    return (
      <span
        title={pub.erro || ''}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 text-red-800 text-xs font-bold shrink-0"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        Não saiu
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold shrink-0">
      <Clock className="w-3.5 h-3.5" />
      Agendada
    </span>
  );
}

/**
 * O selo de um cruzamento bônus (Facebook, YouTube — o mesmo formato para os dois).
 *
 * `undefined` quer dizer que nem foi tentado — a maioria das peças não cruza
 * para nenhuma das duas, e a conta só ganha as credenciais quando o Israel
 * configurar. Por isso, sem tentativa, não aparece nada: um selo cinza
 * "Facebook: —" toda vez seria ruído em peça que nunca teve isso como opção.
 */
function SeloExtra({ rede, dados }: { rede: string; dados?: NonNullable<Peca['publicacao']>['facebook'] }) {
  if (!dados) return null;

  if (dados.status === 'publicada') {
    return dados.link ? (
      <a
        href={dados.link}
        target="_blank"
        rel="noreferrer"
        title={`Também saiu no ${rede}`}
        className="text-[10px] font-bold text-blue-700 hover:underline shrink-0"
      >
        +{rede}
      </a>
    ) : (
      <span title={`Também saiu no ${rede}`} className="text-[10px] font-bold text-blue-700 shrink-0">
        +{rede}
      </span>
    );
  }

  return (
    <span
      title={`Não saiu no ${rede}: ${dados.erro || 'motivo não registrado'}`}
      className="text-[10px] font-bold text-amber-700 shrink-0"
    >
      {rede} não saiu
    </span>
  );
}

/**
 * O que o consultor pode fazer com uma peça agendada.
 *
 * Só aparece quando há o que fazer: peça publicada não mostra botão nenhum, e
 * peça no meio da publicação também não — clicar duas vezes publicaria duas.
 */
function AcoesDePublicacao({ peca, onMudou }: { peca: Peca; onMudou?: () => void }) {
  const pub = peca.publicacao;
  if (pub?.status === 'publicando') return null;

  // Peça que já saiu só oferece a reprise — publicar de novo por engano seria
  // post repetido no perfil.
  if (jaPublicada(peca)) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <BotaoRepublicar peca={peca} onMudou={onMudou} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pub?.status === 'falhou' && pub.erro && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
          <strong>Não saiu:</strong> {pub.erro}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {/* Pausada não mostra "Publicar agora": o consultor acabou de dizer que
            não quer que ela vá. O caminho de volta é Retomar. */}
        {!peca.pausada && <BotaoPublicarAgora peca={peca} onMudou={onMudou} />}
        {peca.agendadoEm && <BotaoPausar peca={peca} onMudou={onMudou} />}
        {!peca.pausada && <BotaoJaPubliquei peca={peca} onMudou={onMudou} />}
      </div>
    </div>
  );
}

/**
 * Tira a peça do ar planejado sem tirá-la do calendário.
 *
 * "Tirar do calendário" perde o dia escolhido; pausar guarda. É a diferença
 * entre "não quero mais nesta data" e "não agora, mas o plano continua".
 */
function BotaoPausar({ peca, onMudou }: { peca: Peca; onMudou?: () => void }) {
  const [salvando, setSalvando] = useState(false);
  const pausada = Boolean(peca.pausada);

  async function alternar() {
    setSalvando(true);
    try {
      await updateDoc(doc(db, COLECOES.pecas, peca.id), {
        pausada: !pausada,
        atualizadoEm: new Date().toISOString(),
      });
      onMudou?.();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <button
      onClick={() => void alternar()}
      disabled={salvando}
      title={pausada
        ? 'Volta a valer o dia e a hora marcados.'
        : 'Mantém o dia no calendário, mas não publica até você retomar.'}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold disabled:opacity-50 ${
        pausada
          ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
      {pausada ? 'Retomar' : 'Pausar'}
    </button>
  );
}

/**
 * Põe de novo na fila um conteúdo que já foi ao ar.
 *
 * CLONA a peça em vez de reaproveitar a mesma: o post original mantém o próprio
 * link e data, e o histórico continua contando a verdade. Os arquivos são os
 * mesmos no Storage — nada é copiado, só apontado.
 *
 * O aviso das oito semanas é AVISO. A recomendação de reciclagem de conteúdo
 * evergreen fala em 8 a 10 semanas, mas quem sabe se o assunto voltou a ser
 * notícia é o consultor, e nada aqui é obrigatório.
 */
function BotaoRepublicar({ peca, onMudou }: { peca: Peca; onMudou?: () => void }) {
  const [pedindo, setPedindo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const semanas = semanasDesdePublicacao(peca);
  const cedo = semanas !== null && semanas < SEMANAS_ENTRE_REPRISES;
  const vez = (peca.reprise || 1) + 1;

  async function republicar() {
    setSalvando(true);
    setErro('');
    try {
      const agora = new Date().toISOString();
      const clone = {
        consultorId: peca.consultorId,
        campanhaId: peca.campanhaId,
        tipo: peca.tipo,
        status: 'aprovado',
        versao: peca.versao || 1,
        arquivoUrl: peca.arquivoUrl || null,
        arquivos: peca.arquivos || [],
        capaUrl: peca.capaUrl || null,
        legenda: peca.legenda || null,
        origem: peca.origem || 'gerada',
        // Entra na fila SEM dia: a reprise precisa de um lugar novo no
        // calendário, e reaproveitar o dia antigo a poria no passado.
        reprise: vez,
        repriseDe: peca.repriseDe || peca.id,
        criadoEm: agora,
      };
      await addDoc(collection(db, COLECOES.pecas), semIndefinidos(clone));
      setPedindo(false);
      onMudou?.();
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setSalvando(false);
    }
  }

  if (!pedindo) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={() => setPedindo(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Republicar
        </button>
        {peca.reprise && peca.reprise > 1 && (
          <span className="text-[11px] text-gray-500">já foi ao ar {peca.reprise}x</span>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {cedo
        ? (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
            Esta peça saiu há <strong>{semanas === 0 ? 'menos de uma semana' : `${semanas} semana${semanas > 1 ? 's' : ''}`}</strong>.
            A recomendação é esperar {SEMANAS_ENTRE_REPRISES} semanas antes de repetir um
            conteúdo, e trocar a legenda para quem já viu não achar repetição.
          </p>
        )
        : (
          <p className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2">
            Uma cópia entra na fila, sem dia marcado — você escolhe quando ela sai.
            O post original continua no histórico, com o link dele.
          </p>
        )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => void republicar()}
          disabled={salvando}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold disabled:opacity-50 ${
            cedo ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          {cedo ? 'Republicar mesmo assim' : 'Pôr na fila'}
        </button>
        <button
          onClick={() => setPedindo(false)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
      {erro && <p className="text-xs text-red-700">{erro}</p>}
    </div>
  );
}

/**
 * Tira as chaves com valor indefinido antes de gravar.
 * O Firestore recusa `undefined` e derruba a gravação inteira por causa de um
 * campo opcional que a peça de origem não tinha.
 */
function semIndefinidos<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/**
 * Manda a peça para a rede agora, sem esperar a hora marcada.
 *
 * A tela não fala com o Instagram: ela escreve uma tarefa na fila, e o worker
 * publica. Publicar leva minutos (o Instagram baixa e transcodifica o vídeo) —
 * tempo demais para uma requisição do navegador, que morreria no meio.
 */
function BotaoPublicarAgora({
  peca, onMudou, miudo = false,
}: {
  peca: Peca; onMudou?: () => void; miudo?: boolean;
}) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [pedindo, setPedindo] = useState(false);

  async function publicar() {
    setEnviando(true);
    setErro('');
    try {
      await addDoc(collection(db, COLECOES.tarefas), {
        consultorId: peca.consultorId,
        campanhaId: peca.campanhaId,
        pecaId: peca.id,
        tipo: 'publicar',
        status: 'pendente',
        tentativas: 0,
        criadoEm: new Date().toISOString(),
        criadoEmServidor: serverTimestamp(),
      });
      // O worker escreve 'publicando' na peça em segundos; recarregar mostra isso.
      await updateDoc(doc(db, COLECOES.pecas, peca.id), {
        publicacao: { status: 'publicando', erro: null, tentadoEm: new Date().toISOString() },
        atualizadoEm: new Date().toISOString(),
      });
      setPedindo(false);
      onMudou?.();
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setEnviando(false);
    }
  }

  const rotulo = peca.publicacao?.status === 'falhou' ? 'Tentar de novo' : 'Publicar agora';

  if (miudo) {
    return (
      <button
        onClick={() => void publicar()}
        disabled={enviando}
        className="w-full px-1 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 disabled:opacity-50"
      >
        {enviando ? '…' : rotulo}
      </button>
    );
  }

  // Confirmação antes de ir ao ar: publicar é irreversível — apagar depois não
  // desfaz quem já viu.
  if (!pedindo) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={() => setPedindo(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
        >
          {peca.publicacao?.status === 'falhou' ? <RotateCcw className="w-3.5 h-3.5" /> : <Rocket className="w-3.5 h-3.5" />}
          {rotulo}
        </button>
        {erro && <p className="text-xs text-red-700">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-gray-800">
        Publicar no {peca.publicacao?.rede === 'linkedin' || peca.tipo.startsWith('linkedin') ? 'LinkedIn' : 'Instagram'} agora?
      </span>
      <button
        onClick={() => void publicar()}
        disabled={enviando}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50"
      >
        {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        Sim, publicar
      </button>
      <button
        onClick={() => setPedindo(false)}
        className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50"
      >
        Cancelar
      </button>
      {erro && <p className="text-xs text-red-700 w-full">{erro}</p>}
    </div>
  );
}

/**
 * Registra a publicação feita à mão.
 *
 * Existe porque nem tudo vai pela API: um formato novo, uma rede que o consultor
 * ainda não conectou, ou simplesmente a vontade de postar do celular. Sem isto a
 * peça ficaria "Agendada" para sempre e o histórico mentiria.
 */
function BotaoJaPubliquei({ peca, onMudou }: { peca: Peca; onMudou?: () => void }) {
  const [abrindo, setAbrindo] = useState(false);
  const [link, setLink] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function registrar() {
    setSalvando(true);
    setErro('');
    try {
      await updateDoc(doc(db, COLECOES.pecas, peca.id), {
        status: 'publicado',
        publicacao: {
          rede: peca.tipo.startsWith('linkedin') ? 'linkedin' : 'instagram',
          status: 'publicada',
          manual: true,
          link: link.trim() || null,
          publicadoEm: new Date().toISOString(),
          erro: null,
        },
        atualizadoEm: new Date().toISOString(),
      });
      setAbrindo(false);
      onMudou?.();
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setSalvando(false);
    }
  }

  if (!abrindo) {
    return (
      <button
        onClick={() => setAbrindo(true)}
        className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50"
      >
        Já publiquei à mão
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Cole o endereço do post (opcional)"
        className="flex-1 min-w-[200px] px-2 py-1.5 rounded border border-gray-300 text-xs"
      />
      <button
        onClick={() => void registrar()}
        disabled={salvando}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50"
      >
        {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        Marcar como publicada
      </button>
      <button
        onClick={() => setAbrindo(false)}
        className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50"
      >
        Cancelar
      </button>
      {erro && <p className="text-xs text-red-700 w-full">{erro}</p>}
    </div>
  );
}

/** Abre o arquivo da peça numa aba. É o que dá para oferecer até a publicação existir. */
function LinkDoArquivo({ caminho }: { caminho?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [semArquivo, setSemArquivo] = useState(false);

  useEffect(() => {
    setUrl(null);
    // Peça antiga, produzida na máquina antes da fila existir: o caminho aponta
    // para uma pasta local (ENTREGAS/...), e não para o Storage. Não há arquivo
    // nenhum para abrir daqui.
    if (!caminho || !caminho.startsWith('marketing/')) { setSemArquivo(true); return; }
    setSemArquivo(false);
    let vivo = true;
    getDownloadURL(storageRef(storage, caminho))
      .then((u) => { if (vivo) setUrl(u); })
      .catch(() => { if (vivo) setSemArquivo(true); });
    return () => { vivo = false; };
  }, [caminho]);

  // Sem isto ficava "carregando…" para sempre, e o consultor esperava um arquivo
  // que nunca ia chegar.
  if (semArquivo) {
    return (
      <span className="text-xs text-gray-400 shrink-0" title={caminho}>
        arquivo fora da plataforma
      </span>
    );
  }
  if (!url) return <span className="text-xs text-gray-400 shrink-0">carregando…</span>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="px-3 py-1.5 rounded-lg border border-blue-300 bg-white text-blue-700 text-sm font-semibold shrink-0 hover:bg-blue-50"
    >
      Abrir arquivo
    </a>
  );
}

/* ====================== Auxiliares ====================== */

export function useDadosMarketing(consultorId: string) {
  const [config, setConfig] = useState<MarketingConfig | null>(null);
  const [videos, setVideos] = useState<VideoFonte[]>([]);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [carregando, setCarregando] = useState(true);
  // Muda de valor para forçar nova leitura depois que o consultor cria algo.
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!consultorId) return;
    let vivo = true;
    (async () => {
      try {
        const porConsultor = (col: string) =>
          getDocs(query(collection(db, col), where('consultorId', '==', consultorId)));
        const [cfg, vs, cs, ps] = await Promise.all([
          getDoc(doc(db, COLECOES.config, consultorId)),
          porConsultor(COLECOES.videos),
          porConsultor(COLECOES.campanhas),
          porConsultor(COLECOES.pecas),
        ]);
        if (!vivo) return;
        setConfig(cfg.exists() ? (cfg.data() as MarketingConfig) : null);
        setVideos(vs.docs.map((d) => d.data() as VideoFonte));
        setCampanhas(cs.docs.map((d) => d.data() as Campanha));
        setPecas(ps.docs.map((d) => d.data() as Peca));
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
  }, [consultorId, versao]);

  // Enquanto houver trabalho rodando no servidor, a tela se atualiza sozinha.
  // Sem isso o consultor tinha que ficar clicando em "Atualizar" pra descobrir se
  // já acabou — e transcrever uma aula longa leva minutos, produzir leva um.
  //
  // Vale pros dois: a transcrição, que roda no serviço da plataforma, e a produção
  // das peças, que roda no worker.
  const trabalhando = videos.some(
    (v) => v.transcricaoStatus === 'na-fila' || v.transcricaoStatus === 'processando',
  // A capa do Reel tem o próprio estado, separado do Reel — e também conta.
  ) || campanhas.some((c) => c.status === 'processando' || c.capaStatus === 'processando')
  // Uma revisão individual trabalha na peça, não na campanha. Mesmo que a
  // campanha tenha um erro antigo, a tela precisa continuar atualizando até a
  // peça sair de "gerando".
  || pecas.some((p) => p.status === 'gerando')
  // Publicar também é espera: o Instagram leva minutos transcodificando o vídeo,
  // e é justamente aí que o consultor fica olhando a tela pra ver se saiu.
  || pecas.some((p) => p.publicacao?.status === 'publicando');

  useEffect(() => {
    if (!trabalhando) return;
    // 8s, e não 20: produzir uma peça leva ~60s, então 20s deixava o consultor
    // olhando pra uma tela parada por um terço da espera.
    const t = setInterval(() => setVersao((v) => v + 1), 8000);
    return () => clearInterval(t);
  }, [trabalhando]);

  return {
    config, setConfig, videos, campanhas, pecas, carregando,
    recarregar: () => setVersao((v) => v + 1),
  };
}

const ROTULOS: Record<string, { texto: string; classe: string }> = {
  'na-fila': { texto: 'Na fila', classe: 'bg-gray-100 text-gray-700' },
  gerando: { texto: 'Gerando', classe: 'bg-blue-100 text-blue-800' },
  revisar: { texto: 'Revisar', classe: 'bg-amber-100 text-amber-800' },
  aprovado: { texto: 'Aprovado', classe: 'bg-green-100 text-green-800' },
  publicado: { texto: 'Publicado', classe: 'bg-green-600 text-white' },
  erro: { texto: 'Erro', classe: 'bg-red-100 text-red-800' },
  rascunho: { texto: 'Rascunho', classe: 'bg-gray-100 text-gray-700' },
  processando: { texto: 'Processando', classe: 'bg-blue-100 text-blue-800' },
  aprovada: { texto: 'Aprovada', classe: 'bg-green-100 text-green-800' },
  publicada: { texto: 'Publicada', classe: 'bg-green-600 text-white' },
};

function EtiquetaStatus({ status }: { status: StatusPeca | Campanha['status'] }) {
  const r = ROTULOS[status] || { texto: status, classe: 'bg-gray-100 text-gray-700' };
  return <span className={`text-xs font-bold px-2 py-1 rounded shrink-0 ${r.classe}`}>{r.texto}</span>;
}

function iconePeca(tipo: TipoPeca) {
  const cls = 'w-3.5 h-3.5 inline';
  if (tipo === 'reel') return <Film className={cls} />;
  if (tipo === 'carrossel-feed') return <Layers className={cls} />;
  if (tipo === 'carrossel-video') return <Film className={cls} />;
  if (tipo === 'linkedin-imagem') return <ImageIcon className={cls} />;
  return <FileText className={cls} />;
}

function nomePeca(tipo: TipoPeca) {
  if (tipo === 'reel') return 'Reel';
  if (tipo === 'carrossel-feed') return 'Carrossel de feed';
  if (tipo === 'carrossel-video') return 'Carrossel em vídeo';
  if (tipo === 'linkedin-imagem') return 'Imagem única do LinkedIn';
  if (tipo === 'linkedin-texto') return 'Texto do LinkedIn';
  return 'Carrossel do LinkedIn';
}

function formatarDuracao(s: number) {
  const min = Math.floor(s / 60);
  const seg = s % 60;
  return `${min}min ${String(seg).padStart(2, '0')}s`;
}

function Vazio({ texto }: { texto: string }) {
  return <p className="text-sm text-gray-500 italic p-4 rounded-lg bg-gray-50 border border-dashed border-gray-300">{texto}</p>;
}
