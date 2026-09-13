/**
 * Telas das etapas 2 a 6 do Marketing para Consultores.
 *
 * Nesta entrega são telas de LEITURA: mostram o estado real vindo do Firestore para
 * o consultor ver onde está. As ações (conectar, enviar, gerar, aprovar, agendar)
 * entram nas próximas entregas da fase 1.
 */
import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import {
  Instagram, Linkedin, CheckCircle2, AlertTriangle, Video, Clock,
  FileText, Image as ImageIcon, Film, Layers, Send, Trash2, Loader2,
} from 'lucide-react';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import { diaISO, diasDaSemana, segundaDaSemana, somarDias } from '../../../lib/semana';
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

  if (/\.mp4$/i.test(caminho)) {
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
};

const DIAS_DA_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function EtapaAgenda({
  pecas, campanhas, onMudou,
}: {
  pecas: Peca[];
  campanhas: Campanha[];
  onMudou?: () => void;
}) {
  const [inicio, setInicio] = useState(() => segundaDaSemana(new Date()));
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const dias = diasDaSemana(inicio);
  const hoje = diaISO(new Date());

  // Só peça aprovada entra no calendário: marcar a publicação de algo que ainda
  // está em revisão seria agendar uma peça que ainda pode mudar.
  const aprovadas = pecas.filter((p) => p.status === 'aprovado' || p.status === 'publicado');
  const naFila = aprovadas.filter((p) => !p.agendadoEm);
  const agendadas = aprovadas.filter((p) => p.agendadoEm);

  const tituloDe = (p: Peca) => campanhas.find((c) => c.id === p.campanhaId)?.titulo || '';

  async function escrever(pecaId: string, dados: Record<string, unknown>) {
    setSalvando(true);
    setErro('');
    try {
      await updateDoc(doc(db, COLECOES.pecas, pecaId), { ...dados, atualizadoEm: new Date().toISOString() });
      onMudou?.();
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setSalvando(false);
    }
  }

  function agendar(peca: Peca, dia: Date) {
    setSelecionada(null);
    return escrever(peca.id, {
      agendadoEm: diaISO(dia),
      // Mudar de dia preserva a hora escolhida; só a primeira vez usa a sugestão.
      agendadoHora: peca.agendadoHora || HORA_SUGERIDA[peca.tipo] || '12:00',
    });
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
      if (peca) agendar(peca, dia);
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
    if (peca) agendar(peca, dia);
  }

  const fim = somarDias(inicio, 6);
  const rotuloSemana = inicio.getMonth() === fim.getMonth()
    ? `${inicio.getDate()} a ${fim.getDate()} de ${inicio.toLocaleDateString('pt-BR', { month: 'long' })}`
    : `${inicio.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} a ${fim.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;

  const daSemana = agendadas
    .filter((p) => dias.some((d) => diaISO(d) === p.agendadoEm))
    .sort((a, b) => `${a.agendadoEm}${a.agendadoHora || ''}`.localeCompare(`${b.agendadoEm}${b.agendadoHora || ''}`));

  return (
    <div className="space-y-4">
      {/* ── A fila: o que está aprovado e ainda não tem dia ── */}
      <section className="p-4 rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h3 className="text-sm font-bold text-gray-900">
            Aprovadas, sem dia marcado ({naFila.length})
          </h3>
          {salvando && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
        </div>
        <p className="text-xs text-gray-600 mb-3">
          Arraste uma peça para o dia — ou clique nela e depois no dia.
        </p>
        {naFila.length === 0
          ? <Vazio texto="Nada esperando. Tudo que você aprovou já tem dia." />
          : (
            <div className="flex flex-wrap gap-2">
              {naFila.map((p) => (
                <button
                  key={p.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
                  onClick={() => setSelecionada(selecionada === p.id ? null : p.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-grab active:cursor-grabbing ${CORES_PECA[p.tipo].chip}${selecionada === p.id ? ' ring-2 ring-offset-1 ring-blue-500' : ''}`}
                >
                  {iconePeca(p.tipo)}
                  <span className="max-w-[220px] truncate">{nomePeca(p.tipo)} · {tituloDe(p)}</span>
                </button>
              ))}
            </div>
          )}
        {selecionada && (
          <p className="text-xs font-semibold text-blue-700 mt-2">
            Agora clique no dia em que ela vai ao ar.
          </p>
        )}
      </section>

      {/* ── A semana ── */}
      <section className="p-4 rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setInicio(somarDias(inicio, -7))}
              title="Semana anterior"
              className="px-2.5 py-1 rounded border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              ‹
            </button>
            <button
              onClick={() => setInicio(segundaDaSemana(new Date()))}
              className="px-2.5 py-1 rounded border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Esta semana
            </button>
            <button
              onClick={() => setInicio(somarDias(inicio, 7))}
              title="Próxima semana"
              className="px-2.5 py-1 rounded border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              ›
            </button>
          </div>
          <span className="text-sm font-bold text-gray-900 capitalize">{rotuloSemana}</span>
          <div className="flex flex-wrap items-center gap-2.5">
            {TIPOS_PECA.map((t) => (
              <span key={t.id} className="flex items-center gap-1 text-[11px] text-gray-600">
                <span className={`w-2.5 h-2.5 rounded-sm ${CORES_PECA[t.id].ponto}`} />
                {t.nome}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {dias.map((d, i) => {
            const chave = diaISO(d);
            const doDia = agendadas
              .filter((p) => p.agendadoEm === chave)
              .sort((a, b) => (a.agendadoHora || '').localeCompare(b.agendadoHora || ''));
            const ehHoje = chave === hoje;
            return (
              <div
                key={chave}
                onDragOver={(e) => e.preventDefault()}
                onDrop={aoLargar(d)}
                onClick={() => aoClicarNoDia(d)}
                className={`min-h-[150px] rounded-lg border p-1.5 transition-colors ${
                  ehHoje ? 'border-blue-400 bg-blue-50/40 ' : 'border-gray-200 bg-gray-50/60 '
                }${selecionada ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-300' : ''}`}
              >
                <div className="flex items-baseline justify-between px-0.5 mb-1">
                  <span className={`text-[10px] font-bold uppercase ${ehHoje ? 'text-blue-700' : 'text-gray-400'}`}>
                    {DIAS_DA_SEMANA[i]}
                  </span>
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
                        <span className="block font-bold">{p.agendadoHora}</span>
                        <span className="block truncate font-semibold">{nomePeca(p.tipo)}</span>
                        <span className="block truncate opacity-80">{tituloDe(p)}</span>
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

      {/* ── A semana em lista, com o arquivo de cada peça ── */}
      <section className="p-4 rounded-lg border border-gray-200 bg-white">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Nesta semana ({daSemana.length})</h3>
        <p className="text-xs text-gray-600 mb-3">
          A publicação automática entra quando as suas redes estiverem conectadas (etapa 2).
          Por enquanto, abra o arquivo no dia e publique você mesmo.
        </p>
        {daSemana.length === 0
          ? <Vazio texto="Nenhuma peça marcada para esta semana." />
          : (
            <div className="space-y-2">
              {daSemana.map((p) => (
                <div key={p.id} className="p-2.5 rounded-lg border border-gray-200 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-gray-800 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${CORES_PECA[p.tipo].ponto}`} />
                    <strong className="shrink-0">
                      {new Date(`${p.agendadoEm}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })}
                      {' '}
                      {p.agendadoHora}
                    </strong>
                    <span className="truncate">{nomePeca(p.tipo)} — {tituloDe(p)}</span>
                  </span>
                  <LinkDoArquivo caminho={p.arquivoUrl} />
                </div>
              ))}
            </div>
          )}
      </section>
    </div>
  );
}

/** Abre o arquivo da peça numa aba. É o que dá para oferecer até a publicação existir. */
function LinkDoArquivo({ caminho }: { caminho?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!caminho || !caminho.startsWith('marketing/')) return;
    let vivo = true;
    getDownloadURL(storageRef(storage, caminho))
      .then((u) => { if (vivo) setUrl(u); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [caminho]);

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
  ) || campanhas.some((c) => c.status === 'processando');

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
  return <FileText className={cls} />;
}

function nomePeca(tipo: TipoPeca) {
  if (tipo === 'reel') return 'Reel';
  if (tipo === 'carrossel-feed') return 'Carrossel de feed';
  if (tipo === 'carrossel-video') return 'Carrossel em vídeo';
  return 'Documento PDF';
}

function formatarDuracao(s: number) {
  const min = Math.floor(s / 60);
  const seg = s % 60;
  return `${min}min ${String(seg).padStart(2, '0')}s`;
}

function Vazio({ texto }: { texto: string }) {
  return <p className="text-sm text-gray-500 italic p-4 rounded-lg bg-gray-50 border border-dashed border-gray-300">{texto}</p>;
}
