/**
 * Laboratório — aba de TESTES entre "Minhas peças" e "Publicação".
 *
 * Experimento de B-roll, AUTOMÁTICO de ponta a ponta: um clique em Preparar
 * acha os momentos da fala, reaproveita a biblioteca (marketing_brolls, busca
 * por similaridade de conceito) e gera só o que faltar; aprovar a imagem dispara
 * o B-roll; aprovar o último B-roll dispara a montagem do Reel. Ao consultor
 * cabe aprovar, reprovar ou refazer — nunca operar a esteira.
 *
 * Só LÊ o criativo e grava em marketing_laboratorio — nada aqui mexe nas peças
 * nem na publicação.
 * Se o teste não der certo, apagar este arquivo, a aba em MarketingConsultor, a
 * rota /api/marketing-consultor/laboratorio e worker/laboratorio.mjs desfaz tudo.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Check, Clapperboard, FlaskConical, Library, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { auth, db } from '../../../lib/firebase';
import { COLECOES, Criativo } from '../../../types/marketing';
import { useArquivoUrl } from './EtapasPreenchidas';

const COLECAO_LAB = 'marketing_laboratorio';

// Pedido sem resposta há mais de 5 min: o servidor não pegou (ou caiu no meio).
// Sem isto a tela fica girando para sempre e o botão nunca volta.
const TRAVADO_MS = 5 * 60 * 1000;
function parado(pedidoEm?: string) {
  return !pedidoEm || Date.now() - new Date(pedidoEm).getTime() > TRAVADO_MS;
}

interface MomentoLab {
  linha: number;
  inicio: number;
  fim: number;
  frase: string;
  porque: string;
  prompt: string;
  status: 'sugerida' | 'pronta' | 'aprovada';
  imagem?: string;
  /** O que a IA entendeu que o trecho significa. É por aqui que a busca acha. */
  conceitos?: string[];
  /** Veio pronta da biblioteca: o id do item, a nota e os conceitos que bateram. */
  daBiblioteca?: string;
  confianca?: number;
  conceitoQueBateu?: string;
  geradas?: number;
  criadoEm: string;
  broll?: string;
  brollMovimento?: Movimento;
  brollStatus?: 'gerando' | 'pronto' | 'erro';
  brollErro?: string | null;
  brollAprovado?: boolean;
  brollPedidoEm?: string;
}

type Movimento = 'aproximar' | 'afastar' | 'subir' | 'descer';
const MOVIMENTOS: { id: Movimento; nome: string }[] = [
  { id: 'aproximar', nome: 'Aproximar' },
  { id: 'afastar', nome: 'Afastar' },
  { id: 'subir', nome: 'Deslizar para cima' },
  { id: 'descer', nome: 'Deslizar para baixo' },
];

async function chamarLab(corpo: Record<string, unknown>) {
  const token = await auth.currentUser?.getIdToken();
  const r = await fetch('/api/marketing-consultor/laboratorio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(corpo),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.error || `Erro ${r.status}`);
  return dados;
}

export function EtapaLaboratorio({ criativos }: { criativos: Criativo[] }) {
  // Só criativo de vídeo aprovado: é o que vira Reel.
  const opcoes = useMemo(
    () => criativos.filter((c) => c.status === 'aprovado' && c.origem !== 'pesquisa' && c.videoId),
    [criativos],
  );
  const [criativoId, setCriativoId] = useState('');
  const [momentos, setMomentos] = useState<Record<string, MomentoLab>>({});
  const [montagem, setMontagem] = useState<Montagem | null>(null);
  const [sugerindo, setSugerindo] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!criativoId) { setMomentos({}); setMontagem(null); return; }
    return onSnapshot(doc(db, COLECAO_LAB, criativoId), (snap) => {
      setMomentos((snap.data()?.momentos as Record<string, MomentoLab>) || {});
      setMontagem((snap.data()?.montagem as Montagem) || null);
    }, () => { setMomentos({}); setMontagem(null); });
  }, [criativoId]);

  const lista = Object.entries(momentos).sort(([, a], [, b]) => a.linha - b.linha);
  const consultorId = opcoes.find((c) => c.id === criativoId)?.consultorId || '';
  const brollsAprovados = lista.filter(([, m]) => m.brollAprovado && m.broll).length;

  /**
   * Prepara TUDO de uma vez: acha os momentos, pega da biblioteca o que já
   * existe e manda gerar só o que faltou. O consultor não clica em cartão
   * nenhum — ele chega e encontra as imagens prontas para aprovar ou reprovar.
   */
  async function prepararTudo() {
    setSugerindo(true);
    setErro('');
    setAviso('');
    try {
      const r = await chamarLab({ acao: 'sugerir', criativoId });
      const daBiblioteca = Number(r?.daBiblioteca || 0);
      const paraGerar = Number(r?.gerar || 0);
      setAviso(
        paraGerar
          ? `${daBiblioteca} da biblioteca, gerando ${paraGerar} nova${paraGerar > 1 ? 's' : ''}…`
          : `${daBiblioteca} da biblioteca. Nada precisou ser gerado.`,
      );

      // O que a biblioteca não cobriu é gerado agora, em sequência: o gerador
      // cobra por imagem e responde em segundos, então não vale paralelizar e
      // arriscar estourar limite por uma economia de poucos segundos.
      if (paraGerar) {
        const snap = await getDoc(doc(db, COLECAO_LAB, criativoId));
        const atuais = (snap.data()?.momentos || {}) as Record<string, MomentoLab>;
        const semImagem = Object.entries(atuais).filter(([, m]) => !m.imagem);
        for (const [momentoId, m] of semImagem) {
          await chamarLab({ acao: 'gerar', criativoId, momentoId, prompt: m.prompt });
        }
        setAviso(`Pronto: ${daBiblioteca} da biblioteca, ${semImagem.length} gerada${semImagem.length > 1 ? 's' : ''}.`);
      }
    } catch (e: any) { setErro(e.message); }
    finally { setSugerindo(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-purple-50 border border-purple-200">
        <FlaskConical className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
        <p className="text-sm text-purple-900">
          <strong>Área de testes.</strong> Nada aqui muda as suas peças nem a publicação.
          Escolha o criativo e clique em <strong>Preparar</strong>: o sistema acha os momentos da fala, usa as
          imagens que já existem na biblioteca e só gera as que faltarem. Você aprova ou reprova cada uma.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[260px]">
          <span className="block text-xs font-semibold text-gray-600 mb-1">Criativo aprovado</span>
          <select
            value={criativoId}
            onChange={(e) => { setCriativoId(e.target.value); setErro(''); }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Escolha um criativo…</option>
            {opcoes.map((c) => (
              <option key={c.id} value={c.id}>{c.titulo.replace(/\*/g, '')}</option>
            ))}
          </select>
        </label>
        {criativoId && (
          <button
            onClick={prepararTudo}
            disabled={sugerindo}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {sugerindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {sugerindo ? 'Preparando…' : lista.length ? 'Preparar de novo' : 'Preparar imagens'}
          </button>
        )}
      </div>
      {aviso && <p className="text-xs font-semibold text-blue-700">{aviso}</p>}
      {lista.length > 0 && (
        <p className="text-xs text-gray-500">
          "Preparar de novo" troca as sugestões, mas mantém as imagens que você já aprovou.
        </p>
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {!opcoes.length && (
        <p className="text-sm text-gray-500">Nenhum criativo de vídeo aprovado ainda.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {lista.map(([id, m]) => (
          <CartaoMomento
            key={id} criativoId={criativoId} consultorId={consultorId} momentoId={id} momento={m}
            movimentoPadrao={MOVIMENTOS[lista.findIndex(([k]) => k === id) % MOVIMENTOS.length].id}
          />
        ))}
      </div>

      {lista.length > 0 && (
        <PainelMontagem
          criativoId={criativoId}
          consultorId={consultorId}
          brollsAprovados={brollsAprovados}
          totalBrolls={lista.filter(([, m]) => m.broll).length}
          montagem={montagem}
        />
      )}
    </div>
  );
}

interface Montagem {
  status: 'gerando' | 'pronto' | 'erro';
  video?: string;
  brolls?: { frase: string; inicio: number; duracao: number }[];
  erro?: string | null;
  pedidoEm?: string;
}

/**
 * Passo 3: o Reel de teste. Cada B-roll aprovado entra no segundo em que a frase
 * dele é falada — o worker converte o tempo da aula para o tempo do Reel,
 * contando o início do corte e a velocidade.
 */
function PainelMontagem({ criativoId, consultorId, brollsAprovados, totalBrolls, montagem }: {
  criativoId: string; consultorId: string; brollsAprovados: number; totalBrolls: number; montagem: Montagem | null;
}) {
  const { url } = useArquivoUrl(montagem?.status === 'pronto' ? montagem.video : undefined);
  const [erro, setErro] = useState('');
  const travado = montagem?.status === 'gerando' && parado(montagem.pedidoEm);
  const gerando = montagem?.status === 'gerando' && !travado;

  // MONTA SOZINHO quando o último B-roll é aprovado.
  //
  // Só dispara na transição para "todos aprovados" e quando ainda não há vídeo
  // nenhum: sem isso, aprovar e reprovar em sequência mandaria montar a cada
  // clique, e refazer a montagem à mão continuaria sendo decisão do consultor.
  const todosAprovados = totalBrolls > 0 && brollsAprovados === totalBrolls;
  const jaDisparou = React.useRef(false);
  useEffect(() => {
    if (!todosAprovados || montagem?.video || gerando || jaDisparou.current) return;
    jaDisparou.current = true;
    montar();
  }, [todosAprovados, montagem?.video, gerando]);

  async function montar() {
    setErro('');
    try {
      await updateDoc(doc(db, COLECAO_LAB, criativoId), { 'montagem.status': 'gerando', 'montagem.erro': null, 'montagem.pedidoEm': new Date().toISOString() });
      const agora = new Date().toISOString();
      await addDoc(collection(db, COLECOES.tarefas), {
        consultorId,
        tipo: 'laboratorio-montar',
        criativoId,
        status: 'pendente',
        tentativas: 0,
        criadoEm: agora,
        criadoEmServidor: serverTimestamp(),
      });
    } catch (e: any) {
      setErro(e?.message || String(e));
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-900">3 · Reel com B-roll</p>
          <p className="text-xs text-gray-600">
Monta sozinho quando você aprova o último B-roll. Cada um entra no segundo em que a frase é falada, por 2,5 a 4 s, em tela cheia.
            A sua voz continua, e a legenda fica por cima.
          </p>
        </div>
        <button
          onClick={montar}
          disabled={gerando || !brollsAprovados}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />}
          {gerando ? 'Montando… (1 a 2 min)' : montagem?.video ? 'Montar de novo' : `Montar Reel (${brollsAprovados} B-roll)`}
        </button>
      </div>
      {!brollsAprovados && <p className="text-xs text-gray-500">Aprove pelo menos um B-roll para montar.</p>}
      {travado && <p className="text-sm text-amber-700">O pedido anterior não respondeu. Clique de novo para montar.</p>}
      {montagem?.status === 'erro' && <p className="text-sm text-red-600">Não saiu: {montagem.erro}</p>}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {url && (
        <div className="flex flex-wrap gap-4 items-start">
          <video key={url} src={url} controls playsInline className="w-64 rounded-lg border border-gray-200 bg-black" />
          <ul className="text-xs text-gray-700 space-y-1.5">
            {(montagem?.brolls || []).map((b, i) => (
              <li key={i}>
                <strong>{b.inicio.toFixed(1)}s – {(b.inicio + b.duracao).toFixed(1)}s</strong> · “{b.frase}”
              </li>
            ))}
            <li className="text-gray-500 pt-1">Este vídeo é só um teste: o Reel de "Minhas peças" continua o mesmo.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function tempo(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function CartaoMomento({ criativoId, consultorId, momentoId, momento, movimentoPadrao }: {
  criativoId: string; consultorId: string; momentoId: string; momento: MomentoLab; movimentoPadrao: Movimento;
}) {
  const { url, carregando } = useArquivoUrl(momento.imagem);
  const { url: urlBroll } = useArquivoUrl(momento.broll);
  const [movimento, setMovimento] = useState<Movimento>(momento.brollMovimento || movimentoPadrao);
  const brollTravado = momento.brollStatus === 'gerando' && parado(momento.brollPedidoEm);
  const fazendoBroll = momento.brollStatus === 'gerando' && !brollTravado;
  const brollAprovado = Boolean(momento.brollAprovado);
  const [pedido, setPedido] = useState(momento.prompt);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const aprovada = momento.status === 'aprovada';

  useEffect(() => { setPedido(momento.prompt); }, [momento.prompt]);

  async function gerar() {
    setGerando(true);
    setErro('');
    try { await chamarLab({ acao: 'gerar', criativoId, momentoId, prompt: pedido }); }
    catch (e: any) { setErro(e.message); }
    finally { setGerando(false); }
  }

  // Mesma fila do worker que gera as peças; a tarefa não leva campanhaId nem
  // pecaId, então um erro aqui nunca marca peça ou campanha.
  async function gerarBroll() {
    setErro('');
    try {
      await updateDoc(doc(db, COLECAO_LAB, criativoId), {
        [`momentos.${momentoId}.brollStatus`]: 'gerando',
        [`momentos.${momentoId}.brollPedidoEm`]: new Date().toISOString(),
        [`momentos.${momentoId}.brollErro`]: null,
        [`momentos.${momentoId}.brollAprovado`]: false,
      });
      const agora = new Date().toISOString();
      await addDoc(collection(db, COLECOES.tarefas), {
        consultorId,
        tipo: 'laboratorio-broll',
        criativoId,
        momentoId,
        movimento,
        status: 'pendente',
        tentativas: 0,
        criadoEm: agora,
        criadoEmServidor: serverTimestamp(),
      });
    } catch (e: any) {
      setErro(e?.message || String(e));
    }
  }

  /**
   * Aprovar a imagem já dispara o B-roll, com o movimento sugerido.
   *
   * O consultor não precisa escolher movimento nem apertar um segundo botão: o
   * caminho normal é aprovar e seguir. Se ele quiser outro movimento, troca no
   * seletor embaixo do vídeo e clica em Refazer.
   */
  async function alternarAprovacao() {
    const vaiAprovar = !aprovada;
    await updateDoc(doc(db, COLECAO_LAB, criativoId), {
      [`momentos.${momentoId}.status`]: vaiAprovar ? 'aprovada' : 'pronta',
    });
    if (vaiAprovar && !momento.broll && !fazendoBroll) await gerarBroll();
  }

  async function alternarAprovacaoBroll() {
    await updateDoc(doc(db, COLECAO_LAB, criativoId), {
      [`momentos.${momentoId}.brollAprovado`]: !brollAprovado,
    });
  }

  // Lado a lado: a imagem (passo 1) à esquerda, o B-roll feito dela (passo 2) à
  // direita. Cada um tem o seu Refazer + Aprovar, no mesmo canto.
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="grid grid-cols-2 gap-px bg-gray-200">
        {/* IMAGEM */}
        <div className="bg-white">
          {/* DE ONDE VEIO ESTA IMAGEM.
              Fica visível sempre, e não escondido num detalhe: é assim que se
              confere que o sistema reaproveitou a biblioteca em vez de gerar
              de novo algo que já existia. */}
          <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
            <span>1 · Imagem</span>
            {momento.daBiblioteca ? (
              <span
                title={`Achou pelo conceito: ${momento.conceitoQueBateu || '—'} (semelhança ${momento.confianca ?? '—'})`}
                className="normal-case tracking-normal font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-800"
              >
                <Library className="w-3 h-3 inline -mt-0.5 mr-0.5" />
                da biblioteca
              </span>
            ) : momento.imagem ? (
              <span className="normal-case tracking-normal font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                gerada agora
              </span>
            ) : null}
          </p>
          <div className={`relative aspect-[9/16] bg-gray-100 grid place-items-center ${aprovada ? 'ring-2 ring-inset ring-green-500' : ''}`}>
            {url && <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
            {!url && (gerando || carregando) && <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />}
            {!url && !gerando && !carregando && (
              <button
                onClick={gerar}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                <Sparkles className="w-4 h-4" /> Gerar imagem
              </button>
            )}
            {url && gerando && (
              <div className="absolute inset-0 bg-white/60 grid place-items-center">
                <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
              </div>
            )}
            {url && (
              <BotoesRevisao
                aprovado={aprovada}
                ocupado={gerando}
                onRefazer={gerar}
                onAprovar={alternarAprovacao}
                dicaRefazer="Gerar outra imagem com o pedido abaixo"
              />
            )}
          </div>
        </div>

        {/* B-ROLL */}
        <div className="bg-white">
          <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">2 · B-roll</p>
          <div className={`relative aspect-[9/16] bg-gray-50 grid place-items-center ${brollAprovado ? 'ring-2 ring-inset ring-green-500' : ''}`}>
            {urlBroll && (
              <video
                key={urlBroll} src={urlBroll} autoPlay loop muted playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {fazendoBroll && (
              <div className="absolute inset-0 bg-white/60 grid place-items-center">
                <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
              </div>
            )}
            {!urlBroll && !fazendoBroll && (
              <div className="px-3 text-center space-y-2">
                {aprovada ? (
                  <>
                    <p className="text-xs text-gray-600">O B-roll não saiu. Tente de novo:</p>
                    <SeletorMovimento valor={movimento} onMudar={setMovimento} />
                    <button
                      onClick={gerarBroll}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                    >
                      <Clapperboard className="w-3.5 h-3.5" /> Gerar B-roll
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">Aprove a imagem e o B-roll é feito sozinho.</p>
                )}
              </div>
            )}
            {urlBroll && (
              <BotoesRevisao
                aprovado={brollAprovado}
                ocupado={fazendoBroll}
                onRefazer={gerarBroll}
                onAprovar={alternarAprovacaoBroll}
                dicaRefazer="Gerar de novo com o movimento escolhido abaixo"
              />
            )}
          </div>
          {urlBroll && (
            <div className="p-2">
              <SeletorMovimento valor={movimento} onMudar={setMovimento} desligado={fazendoBroll || brollAprovado} />
            </div>
          )}
          {brollTravado && (
            <p className="px-2 pb-2 text-xs text-amber-700">O pedido anterior não respondeu. Clique de novo.</p>
          )}
          {momento.brollStatus === 'erro' && (
            <p className="px-2 pb-2 text-xs text-red-600">Não saiu: {momento.brollErro}</p>
          )}
        </div>
      </div>

      <div className="p-3 space-y-2">
        <p className="text-xs text-gray-500">{tempo(momento.inicio)} no vídeo da aula</p>
        <p className="text-sm text-gray-900 font-medium">“{momento.frase}”</p>
        <p className="text-xs text-gray-600">{momento.porque}</p>
        {momento.conceitos?.length ? (
          <p className="text-[11px] text-gray-500">
            <span className="font-semibold">Conceitos:</span> {momento.conceitos.join(' · ')}
            {momento.daBiblioteca && (
              <span className="text-green-700"> → achou {momento.daBiblioteca}</span>
            )}
          </p>
        ) : null}
        <details>
          <summary className="text-xs font-semibold text-blue-700 cursor-pointer">Pedido da imagem</summary>
          <textarea
            value={pedido}
            onChange={(e) => setPedido(e.target.value)}
            disabled={aprovada}
            rows={5}
            className="mt-1.5 w-full border border-gray-300 rounded-lg p-2 text-xs"
          />
          <p className="text-[11px] text-gray-500">Em inglês, que é como o gerador entende melhor. Mude e clique em Refazer.</p>
        </details>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
      </div>
    </div>
  );
}

function BotoesRevisao({ aprovado, ocupado, onRefazer, onAprovar, dicaRefazer }: {
  aprovado: boolean; ocupado: boolean; onRefazer: () => void; onAprovar: () => void; dicaRefazer: string;
}) {
  return (
    <div className="absolute top-2 right-2 flex gap-1">
      <button
        onClick={onRefazer}
        disabled={ocupado || aprovado}
        title={dicaRefazer}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/95 text-gray-800 text-[11px] font-semibold shadow hover:bg-white disabled:opacity-50"
      >
        <RotateCcw className="w-3 h-3" /> Refazer
      </button>
      <button
        onClick={onAprovar}
        disabled={ocupado}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold shadow ${
          aprovado ? 'bg-green-600 text-white' : 'bg-white/95 text-gray-800 hover:bg-white'
        }`}
      >
        <Check className="w-3 h-3" /> {aprovado ? 'Aprovado' : 'Aprovar'}
      </button>
    </div>
  );
}

function SeletorMovimento({ valor, onMudar, desligado = false }: {
  valor: Movimento; onMudar: (m: Movimento) => void; desligado?: boolean;
}) {
  return (
    <select
      value={valor}
      onChange={(e) => onMudar(e.target.value as Movimento)}
      disabled={desligado}
      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white disabled:opacity-60"
    >
      {MOVIMENTOS.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
    </select>
  );
}
