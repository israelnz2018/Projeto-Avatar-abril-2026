/**
 * Ações das etapas 3 e 4: cadastrar um vídeo e criar uma campanha.
 *
 * Estas são as duas telas que fazem o consultor sair do papel de espectador. A etapa 3
 * registra a aula longa; a etapa 4 transforma um trecho dela em pedido na fila.
 *
 * A plataforma NÃO renderiza nada. Ela só escreve a tarefa em marketing_tarefas.
 * Quem gera a imagem é o worker, que roda fora daqui com o ffmpeg e o Chromium.
 */
import React, { useState } from 'react';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Plus, Loader2, Send, Video as VideoIcon, Upload, Link2, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../../../lib/firebase';
import {
  COLECOES, Campanha, ObjetivoCampanha, OBJETIVOS, VideoFonte,
} from '../../../types/marketing';

/* ====================== Etapa 3 — cadastrar vídeo ====================== */

/**
 * Envia o arquivo direto pro Bunny (TUS, resumível) e devolve o guid do vídeo.
 *
 * O mesmo caminho que o restante da plataforma já usa (ver KnowledgeManagerView):
 * o servidor cria o vídeo na Video Library DO CONSULTOR e assina o upload — a chave
 * da library nunca chega ao navegador. Arquivo grande pode levar mais de uma hora;
 * a assinatura vale 24h e o upload retoma sozinho se a conexão cair no meio.
 */
async function enviarVideoParaBunny(
  arquivo: File,
  titulo: string,
  onProgresso: (pct: number) => void,
): Promise<{ guid: string; libraryId: string }> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : '';
  const r = await fetch('/api/bunny/create-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: titulo || arquivo.name.replace(/\.[^.]+$/, '') }),
  });
  const resposta = await r.text();
  let cred: any = {};
  try { cred = resposta ? JSON.parse(resposta) : {}; } catch { /* servidor pode ter devolvido HTML de erro */ }
  if (!r.ok) throw new Error(cred.error || `Não foi possível preparar o envio do vídeo (HTTP ${r.status}).`);
  if (!cred.guid || !cred.libraryId || !cred.signature || !cred.expiration) {
    throw new Error('O servidor não devolveu as credenciais completas de envio.');
  }

  const tus = await import('tus-js-client');
  await new Promise<void>((resolve, reject) => {
    const up = new tus.Upload(arquivo, {
      endpoint: 'https://video.bunnycdn.com/tusupload',
      retryDelays: [0, 3000, 5000, 10000, 20000, 30000, 60000],
      storeFingerprintForResuming: true,
      removeFingerprintOnSuccess: true,
      headers: {
        AuthorizationSignature: cred.signature,
        AuthorizationExpire: String(cred.expiration),
        LibraryId: String(cred.libraryId),
        VideoId: cred.guid,
      },
      metadata: { filetype: arquivo.type || 'video/mp4', title: titulo || arquivo.name },
      onError: (e: any) => reject(e),
      onProgress: (enviado: number, total: number) => onProgresso(Math.round((enviado / total) * 100)),
      onSuccess: () => resolve(),
    });
    void up.findPreviousUploads()
      .then((anteriores) => {
        if (anteriores.length > 0) up.resumeFromPreviousUpload(anteriores[0]);
        up.start();
      })
      .catch(reject);
  });

  return { guid: cred.guid, libraryId: String(cred.libraryId) };
}

export function FormularioVideo({
  consultorId, onCriado,
}: {
  consultorId: string;
  onCriado: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [curso, setCurso] = useState('');
  const [serie, setSerie] = useState('');
  const [duracao, setDuracao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Duas formas de indicar onde está o vídeo: enviar o arquivo agora, ou colar o
  // link de onde ele já está (Bunny, YouTube) — útil pra aulas já hospedadas.
  const [origem, setOrigem] = useState<'arquivo' | 'link'>('arquivo');
  const [sourceUrl, setSourceUrl] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [enviado, setEnviado] = useState<{ guid: string; libraryId: string } | null>(null);

  async function enviarArquivo() {
    if (!arquivo) { setErro('Escolha um arquivo de vídeo.'); return; }
    setErro('');
    setProgresso(0);
    try {
      const resultado = await enviarVideoParaBunny(arquivo, titulo, setProgresso);
      setEnviado(resultado);
      setProgresso(100);
    } catch (e: any) {
      setErro(e?.message || String(e));
      setProgresso(null);
    }
  }

  async function salvar() {
    if (!titulo.trim()) { setErro('O título é obrigatório.'); return; }
    if (origem === 'arquivo' && !enviado) { setErro('Envie o vídeo antes de salvar.'); return; }
    if (origem === 'link' && !sourceUrl.trim()) { setErro('Cole o link do vídeo.'); return; }
    setSalvando(true);
    setErro('');
    try {
      const id = `${consultorId}__${gerarSlug(titulo)}`;
      const video: VideoFonte = {
        id,
        consultorId,
        titulo: titulo.trim(),
        curso: curso.trim() || undefined,
        serie: serie.trim() || undefined,
        bunnyVideoId: origem === 'arquivo' ? enviado?.guid : undefined,
        bunnyLibraryId: origem === 'arquivo' ? enviado?.libraryId : undefined,
        sourceUrl: origem === 'link' ? sourceUrl.trim() : undefined,
        duracaoSegundos: duracao ? Number(duracao) : undefined,
        temTranscricao: false,
        criadoEm: new Date().toISOString(),
      };
      // Limpa os campos vazios: o Firestore rejeita undefined.
      const limpo = Object.fromEntries(Object.entries(video).filter(([, v]) => v !== undefined));
      await setDoc(doc(db, COLECOES.videos, id), limpo, { merge: true });

      // O vídeo é SALVO PRIMEIRO e a transcrição roda depois, no servidor. Antes era o
      // contrário — transcrever e só então salvar —, e uma falha na transcrição levava
      // junto o vídeo inteiro, que já estava no Bunny e não aparecia em lugar nenhum.
      if (origem === 'arquivo' && enviado) {
        const user = auth.currentUser;
        const token = user ? await user.getIdToken() : '';
        await fetch('/api/bunny/transcribe-marketing-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ videoId: id }),
        }).catch(() => { /* a lista mostra o estado e oferece "tentar de novo" */ });
      }

      setTitulo(''); setCurso(''); setSerie(''); setSourceUrl(''); setDuracao('');
      setArquivo(null); setEnviado(null); setProgresso(null);
      setAberto(false);
      onCriado();
    } catch (e) {
      setErro(String(e));
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
      >
        <Plus className="w-4 h-4" /> Cadastrar um vídeo
      </button>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-blue-300 bg-blue-50/40 space-y-3">
      <p className="flex items-center gap-2 font-bold text-gray-900">
        <VideoIcon className="w-4 h-4 text-blue-600" /> Novo vídeo
      </p>

      <Campo rotulo="Título da aula" obrigatorio>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Definição de Lean Six Sigma"
          className={ENTRADA}
        />
      </Campo>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Campo rotulo="Curso">
          <input value={curso} onChange={(e) => setCurso(e.target.value)} placeholder="White Belt" className={ENTRADA} />
        </Campo>
        <Campo rotulo="Série ou módulo">
          <input value={serie} onChange={(e) => setSerie(e.target.value)} placeholder="Parte 1" className={ENTRADA} />
        </Campo>
      </div>

      <div>
        <span className="text-xs font-bold text-gray-700 block mb-1.5">Onde está o vídeo *</span>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setOrigem('arquivo')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border ${
              origem === 'arquivo' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Enviar um arquivo
          </button>
          <button
            type="button"
            onClick={() => setOrigem('link')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border ${
              origem === 'link' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" /> Já tenho um link
          </button>
        </div>

        {origem === 'arquivo' ? (
          <div className="p-3 rounded-lg border border-gray-300 bg-white space-y-2">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => { setArquivo(e.target.files?.[0] || null); setEnviado(null); setProgresso(null); }}
              className="text-sm w-full"
            />
            {arquivo && !enviado && (
              <button
                type="button"
                onClick={enviarArquivo}
                disabled={progresso !== null && progresso < 100}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {progresso !== null && progresso < 100
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando… {progresso}%</>
                  : <><Upload className="w-3.5 h-3.5" /> Enviar vídeo</>}
              </button>
            )}
            {progresso !== null && progresso < 100 && (
              <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full bg-blue-600 transition-all" style={{ width: `${progresso}%` }} />
              </div>
            )}
            {enviado && (
              <p className="flex items-center gap-1.5 text-sm text-green-700 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Vídeo enviado.
              </p>
            )}

            {enviado && (
              <p className="text-xs text-blue-800">
                A transcrição começa quando você salvar, e roda no servidor — pode fechar
                esta tela. O andamento aparece na lista de vídeos.
              </p>
            )}

            <p className="text-xs text-gray-500">
              Vídeo grande pode demorar. Se a conexão cair, envie de novo — ele retoma de onde parou.
            </p>
          </div>
        ) : (
          <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" className={ENTRADA} />
        )}
      </div>

      <Campo rotulo="Duração em segundos">
        <input value={duracao} onChange={(e) => setDuracao(e.target.value.replace(/\D/g, ''))} placeholder="900" className={`${ENTRADA} max-w-[180px]`} />
      </Campo>

      {erro && <p className="text-sm text-red-700">{erro}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={salvar}
          disabled={salvando}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Salvar vídeo
        </button>
        <button onClick={() => setAberto(false)} className="px-3 py-2 text-sm font-semibold text-gray-600">
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ====================== Etapa 4 — criar campanha ====================== */

/**
 * Por enquanto o conteúdo dos slides é escrito pelo consultor, um bloco por slide.
 * A extração automática a partir da transcrição é a próxima entrega — enquanto ela não
 * existe, é mais honesto pedir o texto do que inventar frase genérica.
 */
export function FormularioCampanha({
  consultorId, videos, onCriada,
}: {
  consultorId: string;
  videos: VideoFonte[];
  onCriada: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [videoId, setVideoId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [objetivo, setObjetivo] = useState<ObjetivoCampanha>('autoridade');
  const [corteInicio, setCorteInicio] = useState('');
  const [corteFim, setCorteFim] = useState('');
  const [blocos, setBlocos] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const slides = interpretarBlocos(blocos);
  const semVideo = videos.length === 0;

  async function criar() {
    if (!videoId) { setErro('Escolha o vídeo de origem.'); return; }
    if (!titulo.trim()) { setErro('Dê um título à campanha.'); return; }
    if (slides.length < 6 || slides.length > 8) {
      setErro(`O carrossel precisa de 6 a 8 slides. Você escreveu ${slides.length}.`);
      return;
    }
    setEnviando(true);
    setErro('');
    try {
      const campanhaId = `${consultorId}__${gerarSlug(titulo)}`;
      const agora = new Date().toISOString();

      const campanha: Campanha = {
        id: campanhaId,
        consultorId,
        videoId,
        titulo: titulo.trim(),
        objetivo,
        status: 'processando',
        corteInicio: corteInicio.trim() || undefined,
        corteFim: corteFim.trim() || undefined,
        criadoEm: agora,
      };
      const limpo = Object.fromEntries(Object.entries(campanha).filter(([, v]) => v !== undefined));
      await setDoc(doc(db, COLECOES.campanhas, campanhaId), limpo, { merge: true });

      // O pedido para o worker. Ele não decide conteúdo — executa o que está aqui.
      await addDoc(collection(db, COLECOES.tarefas), {
        consultorId,
        campanhaId,
        tipo: 'gerar-campanha',
        status: 'pendente',
        tentativas: 0,
        render: {
          date: agora.slice(0, 10),
          slug: gerarSlug(titulo),
          folderType: 'Carrossel',
          sequence: 1,
          video: { enabled: false },
          signature: assinatura(videos.find((v) => v.id === videoId)),
          slides,
        },
        criadoEm: agora,
        criadoEmServidor: serverTimestamp(),
      });

      setAberto(false);
      setTitulo(''); setBlocos(''); setCorteInicio(''); setCorteFim('');
      onCriada();
    } catch (e) {
      setErro(String(e));
    } finally {
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        disabled={semVideo}
        title={semVideo ? 'Cadastre um vídeo na etapa 3 primeiro.' : undefined}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4" /> Criar campanha
      </button>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-blue-300 bg-blue-50/40 space-y-3">
      <p className="font-bold text-gray-900">Nova campanha</p>

      <Campo rotulo="Vídeo de origem" obrigatorio>
        <select value={videoId} onChange={(e) => setVideoId(e.target.value)} className={ENTRADA}>
          <option value="">Escolha…</option>
          {videos.map((v) => <option key={v.id} value={v.id}>{v.titulo}</option>)}
        </select>
      </Campo>

      <Campo rotulo="Título da campanha" obrigatorio>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: O que é Lean Six Sigma" className={ENTRADA} />
      </Campo>

      <Campo rotulo="Objetivo">
        <select value={objetivo} onChange={(e) => setObjetivo(e.target.value as ObjetivoCampanha)} className={ENTRADA}>
          {OBJETIVOS.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {OBJETIVOS.find((o) => o.id === objetivo)?.descricao}
        </p>
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Trecho começa em" ajuda="Opcional. Formato mm:ss.">
          <input value={corteInicio} onChange={(e) => setCorteInicio(e.target.value)} placeholder="02:15" className={ENTRADA} />
        </Campo>
        <Campo rotulo="Trecho termina em">
          <input value={corteFim} onChange={(e) => setCorteFim(e.target.value)} placeholder="04:40" className={ENTRADA} />
        </Campo>
      </div>

      <Campo
        rotulo="Conteúdo dos slides"
        obrigatorio
        ajuda="Um slide por bloco, separados por uma linha em branco. A primeira linha do bloco é o título; o resto é o texto. Coloque *asteriscos* na palavra que deve aparecer destacada."
      >
        <textarea
          value={blocos}
          onChange={(e) => setBlocos(e.target.value)}
          rows={12}
          placeholder={EXEMPLO_BLOCOS}
          className={`${ENTRADA} font-mono text-xs leading-relaxed`}
        />
      </Campo>

      <p className={`text-xs font-semibold ${
        slides.length >= 6 && slides.length <= 8 ? 'text-green-700' : 'text-amber-700'
      }`}>
        {slides.length} slide{slides.length === 1 ? '' : 's'} — o carrossel precisa de 6 a 8.
      </p>

      {erro && <p className="text-sm text-red-700">{erro}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={criar}
          disabled={enviando}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
        >
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Enviar para produção
        </button>
        <button onClick={() => setAberto(false)} className="px-3 py-2 text-sm font-semibold text-gray-600">
          Cancelar
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Ao enviar, o pedido entra na fila. As peças aparecem na etapa 5 quando ficarem prontas.
      </p>
    </div>
  );
}

/* ====================== Auxiliares ====================== */

const ENTRADA = 'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

const EXEMPLO_BLOCOS = `O que é *Lean Six Sigma*
Duas escolas que viraram uma só: uma corta desperdício, a outra corta variação.

De onde veio o *Lean*
Taiichi Ohno, na Toyota, depois da guerra. O problema era produzir pouco sem desperdiçar.

…`;

function Campo({
  rotulo, ajuda, obrigatorio, children,
}: {
  rotulo: string; ajuda?: string; obrigatorio?: boolean; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-gray-700">
        {rotulo}{obrigatorio && <span className="text-red-600"> *</span>}
      </span>
      {ajuda && <span className="block text-xs text-gray-500 mb-1">{ajuda}</span>}
      <div className={ajuda ? '' : 'mt-1'}>{children}</div>
    </label>
  );
}

function gerarSlug(texto: string) {
  // ̀-ͯ é a faixa dos acentos separados pelo normalize('NFD').
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'campanha';
}

/**
 * Blocos separados por linha em branco viram slides.
 * O primeiro é a capa e o último é a chamada — é a forma do carrossel que já funciona.
 */
export function interpretarBlocos(texto: string) {
  const blocos = texto.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blocos.map((bloco, i) => {
    const [primeira, ...resto] = bloco.split('\n');
    const slide: Record<string, unknown> = {
      type: i === 0 ? 'capa' : i === blocos.length - 1 ? 'cta' : 'padrao',
      title: primeira.trim(),
      body: resto.join(' ').trim(),
    };
    if (slide.type === 'cta') slide.palavra = 'COMECE';
    return slide;
  });
}

/**
 * Rodapé das peças: crédito da fonte e identificação da aula.
 *
 * O crédito vem do vídeo, não de uma configuração fixa — cada aula tem o seu curso,
 * então o rodapé muda sozinho a cada campanha em vez de repetir um texto padrão.
 *
 * Linha curta de propósito. A faixa de baixo divide 1080px com a trilha do processo;
 * assinatura comprida sobra e o renderizador corta com reticências.
 */
function assinatura(video?: VideoFonte) {
  const curto = (t: string) => (t.length > 30 ? `${t.slice(0, 29).trimEnd()}…` : t);
  const linhas: string[] = [];
  if (video?.curso) linhas.push(curto(`FONTE: curso ${video.curso}`));
  if (video?.serie) linhas.push(curto(video.serie.toUpperCase()));
  else if (video?.titulo) linhas.push(curto(video.titulo.toUpperCase()));
  return linhas.length ? linhas : ['LBW'];
}
