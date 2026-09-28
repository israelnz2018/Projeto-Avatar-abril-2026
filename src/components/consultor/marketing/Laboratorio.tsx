/**
 * Laboratório — aba de TESTES entre "Minhas peças" e "Publicação".
 *
 * Experimento de B-roll em 3 passos. Passo 1: imagens que ilustram a fala do
 * Reel. Passo 2: a imagem aprovada vira vídeo curto com movimento (tarefa
 * 'laboratorio-broll' do worker, em worker/laboratorio.mjs). Só LÊ o criativo e
 * grava em marketing_laboratorio — nada aqui mexe nas peças nem na publicação.
 * Se o teste não der certo, apagar este arquivo, a aba em MarketingConsultor, a
 * rota /api/marketing-consultor/laboratorio e worker/laboratorio.mjs desfaz tudo.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Check, Clapperboard, FlaskConical, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { auth, db } from '../../../lib/firebase';
import { COLECOES, Criativo } from '../../../types/marketing';
import { useArquivoUrl } from './EtapasPreenchidas';

const COLECAO_LAB = 'marketing_laboratorio';

interface MomentoLab {
  linha: number;
  inicio: number;
  fim: number;
  frase: string;
  porque: string;
  prompt: string;
  status: 'sugerida' | 'pronta' | 'aprovada';
  imagem?: string;
  geradas?: number;
  criadoEm: string;
  broll?: string;
  brollMovimento?: Movimento;
  brollStatus?: 'gerando' | 'pronto' | 'erro';
  brollErro?: string | null;
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
  const [sugerindo, setSugerindo] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!criativoId) { setMomentos({}); return; }
    return onSnapshot(doc(db, COLECAO_LAB, criativoId), (snap) => {
      setMomentos((snap.data()?.momentos as Record<string, MomentoLab>) || {});
    }, () => setMomentos({}));
  }, [criativoId]);

  const lista = Object.entries(momentos).sort(([, a], [, b]) => a.linha - b.linha);
  const consultorId = opcoes.find((c) => c.id === criativoId)?.consultorId || '';

  async function sugerir() {
    setSugerindo(true);
    setErro('');
    try { await chamarLab({ acao: 'sugerir', criativoId }); }
    catch (e: any) { setErro(e.message); }
    finally { setSugerindo(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-purple-50 border border-purple-200">
        <FlaskConical className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
        <p className="text-sm text-purple-900">
          <strong>Área de testes.</strong> Nada aqui muda as suas peças nem a publicação.
          Passo 1: imagens que ilustram a fala do Reel. Passo 2: cada imagem aprovada vira um vídeo
          curto com movimento (B-roll). Passo 3, a seguir: os B-rolls entram no Reel.
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
            onClick={sugerir}
            disabled={sugerindo}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {sugerindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {lista.length ? 'Sugerir de novo' : 'Sugerir imagens'}
          </button>
        )}
      </div>
      {lista.length > 0 && (
        <p className="text-xs text-gray-500">
          "Sugerir de novo" troca as sugestões, mas mantém as imagens que você já aprovou.
        </p>
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {!opcoes.length && (
        <p className="text-sm text-gray-500">Nenhum criativo de vídeo aprovado ainda.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map(([id, m]) => (
          <CartaoMomento
            key={id} criativoId={criativoId} consultorId={consultorId} momentoId={id} momento={m}
            movimentoPadrao={MOVIMENTOS[lista.findIndex(([k]) => k === id) % MOVIMENTOS.length].id}
          />
        ))}
      </div>
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
  const fazendoBroll = momento.brollStatus === 'gerando';
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
        [`momentos.${momentoId}.brollErro`]: null,
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

  async function alternarAprovacao() {
    await updateDoc(doc(db, COLECAO_LAB, criativoId), {
      [`momentos.${momentoId}.status`]: aprovada ? 'pronta' : 'aprovada',
    });
  }

  return (
    <div className={`rounded-xl border bg-white overflow-hidden ${aprovada ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-200'}`}>
      <div className="relative aspect-[9/16] bg-gray-100 grid place-items-center">
        {url && !urlBroll && <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        {urlBroll && (
          <video
            key={urlBroll} src={urlBroll} autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {!url && (gerando || carregando) && <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />}
        {!url && !gerando && !carregando && (
          <button
            onClick={gerar}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
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
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              onClick={gerar}
              disabled={gerando || aprovada}
              title="Gerar outra imagem com o pedido abaixo"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/95 text-gray-800 text-xs font-semibold shadow hover:bg-white disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Refazer
            </button>
            <button
              onClick={alternarAprovacao}
              disabled={gerando}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow ${
                aprovada ? 'bg-green-600 text-white' : 'bg-white/95 text-gray-800 hover:bg-white'
              }`}
            >
              <Check className="w-3.5 h-3.5" /> {aprovada ? 'Aprovada' : 'Aprovar'}
            </button>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <p className="text-xs text-gray-500">{tempo(momento.inicio)} no vídeo da aula</p>
        <p className="text-sm text-gray-900 font-medium">“{momento.frase}”</p>
        <p className="text-xs text-gray-600">{momento.porque}</p>
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
        {aprovada && (
          <div className="pt-2 border-t border-gray-100 space-y-1.5">
            <p className="text-xs font-semibold text-gray-700">B-roll (vídeo de 5 s)</p>
            <div className="flex gap-1.5">
              <select
                value={movimento}
                onChange={(e) => setMovimento(e.target.value as Movimento)}
                disabled={fazendoBroll}
                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white"
              >
                {MOVIMENTOS.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
              <button
                onClick={gerarBroll}
                disabled={fazendoBroll}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {fazendoBroll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clapperboard className="w-3.5 h-3.5" />}
                {fazendoBroll ? 'Gerando…' : momento.broll ? 'Refazer B-roll' : 'Gerar B-roll'}
              </button>
            </div>
            {momento.brollStatus === 'erro' && (
              <p className="text-xs text-red-600">Não saiu: {momento.brollErro}</p>
            )}
          </div>
        )}
        {erro && <p className="text-xs text-red-600">{erro}</p>}
      </div>
    </div>
  );
}
