/**
 * A imagem de cada página do carrossel, e a biblioteca de onde ela vem.
 *
 * Três jeitos de pôr uma imagem numa página, e os três terminam no mesmo lugar:
 *
 *   Biblioteca     escolher uma que já existe — das 12 da casa, das geradas por
 *                  qualquer consultor, ou das fotos que ESTE consultor enviou.
 *   Gerar com IA   a IA lê o texto da página e escolhe as etiquetas; o consultor
 *                  confere, ajusta e só então gera. Uma imagem por clique.
 *   Minha foto     o consultor sobe a própria imagem. Pessoa perde o fundo, cena não.
 *
 * Imagem nova nunca vai direto para a peça. Ela vira CANDIDATA: o worker monta a
 * página com ela, e é a página montada que o consultor aprova. Foto bonita pode
 * ficar ruim na página — rosto cortado pela coluna, cor brigando com a marca — e
 * isso só se vê montado.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes } from 'firebase/storage';
import { Check, ImageOff, Images, Loader2, Search, Sparkles, Upload, Wand2, X } from 'lucide-react';
import { auth, db, storage } from '../../../lib/firebase';
import {
  COLECOES, ImagemBiblioteca, SlideRoteiro, TipoImagem,
  etiquetasValidas, semelhanca, vocabulario,
} from '../../../types/marketing';
import { useArquivoUrl } from './EtapasPreenchidas';

/** O prefixo das fichas das 12 pessoas da casa — o mesmo do worker. */
const PREFIXO_ELENCO = 'elenco-';

/**
 * As 12 da casa, para quando a biblioteca ainda não tem a ficha delas.
 *
 * Rede de segurança: escolher pessoa funcionava antes da biblioteca existir, e não
 * pode deixar de funcionar se a tela subir antes de worker/semear-biblioteca.mjs
 * rodar. Sem ficha, a pessoa aparece sem miniatura — e o worker, que tem as 12 na
 * pasta, usa o arquivo de lá.
 */
const ELENCO_DA_CASA: [string, string, Record<string, string>][] = [
  ['01-frustracao-mulher-30', 'Analista frustrada', { papel: 'analista', emocao: 'frustracao', genero: 'mulher', idade: '30' }],
  ['02-decisao-mulher-30', 'Analista confiante', { papel: 'analista', emocao: 'decisao', genero: 'mulher', idade: '30' }],
  ['03-duvida-homem-40', 'Gestor em dúvida', { papel: 'gestor', emocao: 'duvida', genero: 'homem', idade: '40' }],
  ['04-explicando-homem-40', 'Gestor explicando', { papel: 'gestor', emocao: 'explicando', genero: 'homem', idade: '40' }],
  ['05-sobrecarga-homem-20', 'Júnior sobrecarregado', { papel: 'analista', emocao: 'sobrecarga', genero: 'homem', idade: '20' }],
  ['06-insight-homem-20', 'Júnior com uma ideia', { papel: 'analista', emocao: 'insight', genero: 'homem', idade: '20' }],
  ['07-apontando-mulher-40', 'Engenheira apontando', { papel: 'engenheiro', ambiente: 'fabrica', emocao: 'apontando', genero: 'mulher', idade: '40' }],
  ['08-foco-mulher-40', 'Engenheira medindo', { papel: 'engenheiro', ambiente: 'fabrica', emocao: 'foco', genero: 'mulher', idade: '40' }],
  ['09-ceticismo-homem-50', 'Diretor cético', { papel: 'diretor', emocao: 'ceticismo', genero: 'homem', idade: '50' }],
  ['10-confusao-mulher-20', 'Júnior confusa', { papel: 'analista', emocao: 'confusao', genero: 'mulher', idade: '20' }],
  ['11-explicando-homem-30', 'Analista de dados explicando', { papel: 'analista', emocao: 'explicando', genero: 'homem', idade: '30' }],
  ['12-lideranca-mulher-30', 'Líder apresentando', { papel: 'lider', emocao: 'lideranca', genero: 'mulher', idade: '30' }],
];

function elencoSemFicha(jaNoBanco: Set<string>): ImagemBiblioteca[] {
  return ELENCO_DA_CASA
    .filter(([nome]) => !jaNoBanco.has(`${PREFIXO_ELENCO}${nome}`))
    .map(([nome, titulo, etiquetas]) => ({
      id: `${PREFIXO_ELENCO}${nome}`,
      tipo: 'pessoa',
      origem: 'elenco',
      status: 'aprovada',
      publica: true,
      consultorId: 'lbw',
      titulo,
      etiquetas: { ambiente: 'escritorio', ...etiquetas },
      criadoEm: '',
    }));
}

export type EscolhaImagem =
  | { modo: 'automatica' }
  | { modo: 'nenhuma' }
  | { modo: 'biblioteca'; imagem: Pick<ImagemBiblioteca, 'id' | 'tipo'> };

export interface ContextoImagensValor {
  consultorId: string;
  criativoId: string;
  slides: SlideRoteiro[];
  /** A configuração de produção, a mesma que vai ao worker. A prévia sai dela. */
  montarRender: (slides: SlideRoteiro[]) => Record<string, unknown>;
  /** Quem apareceu em cada página na última produção. */
  imagensPorPagina?: (string | null)[];
  trocarImagem: (indice: number, escolha: EscolhaImagem) => void;
  biblioteca: ReturnType<typeof useBibliotecaImagens>;
}

export const ContextoImagens = createContext<ContextoImagensValor | null>(null);

/**
 * Tira os `undefined` de um objeto antes de gravar.
 *
 * O Firestore recusa o documento INTEIRO quando acha um — e o sintoma é um botão
 * que não faz nada, que é o tipo de defeito que este módulo já teve demais.
 */
export function semIndefinidos<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor));
}

/**
 * A biblioteca que este consultor enxerga: as aprovadas da biblioteca comum, e
 * todas as dele — inclusive as candidatas, que ele ainda precisa decidir.
 */
export function useBibliotecaImagens(consultorId: string) {
  const [imagens, setImagens] = useState<ImagemBiblioteca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!consultorId) return;
    let vivo = true;
    (async () => {
      try {
        const col = collection(db, COLECOES.imagens);
        const [comuns, minhas] = await Promise.all([
          getDocs(query(col, where('publica', '==', true), where('status', '==', 'aprovada'))),
          getDocs(query(col, where('consultorId', '==', consultorId))),
        ]);
        if (!vivo) return;
        const porId = new Map<string, ImagemBiblioteca>();
        for (const d of [...comuns.docs, ...minhas.docs]) porId.set(d.id, { ...(d.data() as ImagemBiblioteca), id: d.id });
        const doBanco = [...porId.values()].filter((i) => i.status !== 'descartada');
        setImagens([...doBanco, ...elencoSemFicha(new Set(porId.keys()))]);
      } catch (e) {
        console.warn('[biblioteca de imagens] não carregou:', e);
        // Mesmo sem o banco, as pessoas da casa continuam escolhíveis.
        if (vivo) setImagens(elencoSemFicha(new Set()));
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
  }, [consultorId, versao]);

  // Enquanto uma imagem está sendo preparada, a tela pergunta de novo sozinha.
  // O preparo leva de 10 a 40 segundos, e ninguém devia ter de clicar em atualizar.
  const preparando = imagens.some((i) => i.status === 'processando');
  useEffect(() => {
    if (!preparando) return;
    const t = setInterval(() => setVersao((v) => v + 1), 5000);
    return () => clearInterval(t);
  }, [preparando]);

  return { imagens, carregando, recarregar: () => setVersao((v) => v + 1) };
}

/** A ficha que corresponde ao que está gravado na página, entendendo o formato antigo. */
function imagemDaPagina(slide: SlideRoteiro, imagens: ImagemBiblioteca[]) {
  const id = slide.imagemId || (typeof slide.pessoa === 'string' && slide.pessoa ? `${PREFIXO_ELENCO}${slide.pessoa}` : '');
  return id ? { id, imagem: imagens.find((i) => i.id === id) } : null;
}

/* ====================== Na página ====================== */

/**
 * O que aparece nesta página, e o botão para trocar.
 *
 * Substitui o <select> de pessoas, que listava 12 nomes sem nenhuma imagem: o
 * consultor escolhia "Foco — mulher, 40" sem saber quem era.
 */
export function SeletorImagemDaPagina({ indice, slide }: { indice: number; slide: SlideRoteiro }) {
  const ctx = useContext(ContextoImagens);
  const [aberto, setAberto] = useState(false);
  if (!ctx || slide.type === 'camadas') return null;

  const { imagens } = ctx.biblioteca;
  const escolhida = imagemDaPagina(slide, imagens);
  const automatica = !escolhida && slide.pessoa !== false;
  const usadaNaUltima = automatica ? imagens.find((i) => i.id === ctx.imagensPorPagina?.[indice]) : undefined;
  const pendentes = imagens.filter((i) => i.criativoId === ctx.criativoId && i.pagina === indice
    && (i.status === 'processando' || i.status === 'candidata'));

  let rotulo: string;
  if (escolhida) rotulo = escolhida.imagem?.titulo || 'Imagem escolhida';
  else if (slide.pessoa === false) rotulo = 'Sem imagem';
  else if (usadaNaUltima) rotulo = `Automática — ${usadaNaUltima.titulo}`;
  else rotulo = slide.type === 'foto' ? 'Sem foto de fundo' : 'Automática';

  const miniatura = escolhida?.imagem?.arquivo || usadaNaUltima?.arquivo;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-9 h-11 rounded border border-gray-200 bg-gray-100 overflow-hidden shrink-0 grid place-items-center">
          {miniatura
            ? <Miniatura caminho={miniatura} className="w-full h-full object-cover object-top" />
            : <ImageOff className="w-3.5 h-3.5 text-gray-400" />}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase text-gray-400 leading-none">Imagem da página</p>
          <p className="text-xs text-gray-800 truncate max-w-[220px]" title={rotulo}>{rotulo}</p>
        </div>
        <button
          onClick={() => setAberto((a) => !a)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50"
        >
          <Images className="w-3.5 h-3.5" /> {aberto ? 'Fechar' : 'Trocar imagem'}
        </button>
        {pendentes.length > 0 && !aberto && (
          <button onClick={() => setAberto(true)} className="text-xs font-bold text-amber-700 hover:underline">
            {pendentes.length} esperando você
          </button>
        )}
      </div>
      {aberto && <PainelImagens indice={indice} slide={slide} aoFechar={() => setAberto(false)} />}
    </div>
  );
}

/* ====================== O painel ====================== */

type Aba = 'biblioteca' | 'gerar' | 'enviar';

function PainelImagens({ indice, slide, aoFechar }: { indice: number; slide: SlideRoteiro; aoFechar: () => void }) {
  const ctx = useContext(ContextoImagens)!;
  const [aba, setAba] = useState<Aba>('biblioteca');
  const [tipo, setTipo] = useState<TipoImagem>(slide.type === 'foto' ? 'cena' : 'pessoa');
  const [aviso, setAviso] = useState('');

  const candidatas = ctx.biblioteca.imagens
    .filter((i) => i.criativoId === ctx.criativoId && i.pagina === indice
      && (i.status === 'processando' || i.status === 'candidata' || i.status === 'erro'))
    .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));

  function usar(imagem: ImagemBiblioteca) {
    ctx.trocarImagem(indice, { modo: 'biblioteca', imagem });
    setAviso(`"${imagem.titulo}" está nesta página. Clique em Refazer no carrossel para produzir com ela.`);
  }

  const abas: { id: Aba; nome: string; icone: typeof Images }[] = [
    { id: 'biblioteca', nome: 'Biblioteca', icone: Images },
    { id: 'gerar', nome: 'Gerar com IA', icone: Wand2 },
    { id: 'enviar', nome: 'Minha imagem', icone: Upload },
  ];

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {abas.map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                aba === a.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <a.icone className="w-3.5 h-3.5" /> {a.nome}
            </button>
          ))}
        </div>
        <button onClick={aoFechar} title="Fechar" className="p-1 rounded text-gray-500 hover:text-gray-800">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="font-bold text-gray-600">Tipo:</span>
        <SeletorTipo tipo={tipo} aoMudar={setTipo} />
      </div>

      {candidatas.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-700">Esperando a sua decisão</p>
          {candidatas.map((c) => (
            <Candidata key={c.id} imagem={c} aoUsar={usar} />
          ))}
        </div>
      )}

      {aba === 'biblioteca' && <AbaBiblioteca indice={indice} tipo={tipo} aoUsar={usar} aoAvisar={setAviso} />}
      {aba === 'gerar' && <AbaGerar indice={indice} slide={slide} tipo={tipo} aoUsar={usar} aoAvisar={setAviso} />}
      {aba === 'enviar' && <AbaEnviar indice={indice} tipo={tipo} aoAvisar={setAviso} />}

      {aviso && <p className="text-xs text-green-800 p-2 rounded bg-green-50 border border-green-200">{aviso}</p>}
    </div>
  );
}

function SeletorTipo({ tipo, aoMudar }: { tipo: TipoImagem; aoMudar: (t: TipoImagem) => void }) {
  return (
    <div className="flex gap-1">
      {([
        ['pessoa', 'Pessoa ao lado do texto'],
        ['cena', 'Cena de fundo'],
      ] as [TipoImagem, string][]).map(([id, nome]) => (
        <button
          key={id}
          onClick={() => aoMudar(id)}
          className={`px-2 py-0.5 rounded-full border text-xs ${
            tipo === id ? 'border-blue-600 bg-blue-100 text-blue-900 font-bold' : 'border-gray-300 bg-white text-gray-600'
          }`}
        >
          {nome}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */

/** Uma imagem recém-chegada: esperando o preparo, ou esperando o consultor. */
function Candidata({ imagem, aoUsar }: { imagem: ImagemBiblioteca; aoUsar: (i: ImagemBiblioteca) => void }) {
  const ctx = useContext(ContextoImagens)!;
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function decidir(status: 'aprovada' | 'descartada') {
    setSalvando(true);
    setErro('');
    try {
      await updateDoc(doc(db, COLECOES.imagens, imagem.id), { status, atualizadoEm: new Date().toISOString() });
      if (status === 'aprovada') aoUsar({ ...imagem, status });
      ctx.biblioteca.recarregar();
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setSalvando(false);
    }
  }

  if (imagem.status === 'processando') {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded bg-white border border-gray-200 text-xs text-gray-700">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
        <span>
          <strong>{imagem.titulo}</strong> — {imagem.tipo === 'pessoa' ? 'tirando o fundo e ' : ''}montando a página.
          Leva cerca de meio minuto; esta tela se atualiza sozinha.
        </span>
      </div>
    );
  }

  if (imagem.status === 'erro') {
    return (
      <div className="flex items-center justify-between gap-2 p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-800">
        <span><strong>{imagem.titulo}</strong> não ficou pronta: {imagem.erro || 'erro desconhecido'}</span>
        <button onClick={() => decidir('descartada')} disabled={salvando} className="font-bold hover:underline shrink-0">
          Descartar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 p-2.5 rounded bg-white border border-amber-300">
      <div className="sm:w-[190px] shrink-0">
        {imagem.previa
          ? <Miniatura caminho={imagem.previa} className="w-full rounded border border-gray-200" />
          : imagem.arquivo && <Miniatura caminho={imagem.arquivo} className="w-full rounded border border-gray-200 bg-gray-100" />}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-sm font-semibold text-gray-900">{imagem.titulo}</p>
        <p className="text-xs text-gray-600">
          {imagem.previa
            ? 'É assim que a página fica com esta imagem.'
            : 'A página não pôde ser montada; a imagem está sozinha.'}
          {' '}{imagem.origem === 'gerada'
            ? 'Aprovada, ela entra na biblioteca comum.'
            : 'Aprovada, ela fica na sua biblioteca — só você usa.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => decidir('aprovada')}
            disabled={salvando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Aprovar e usar nesta página
          </button>
          <button
            onClick={() => decidir('descartada')}
            disabled={salvando}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            Descartar
          </button>
        </div>
        {erro && <p className="text-xs text-red-700">{erro}</p>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function AbaBiblioteca({
  indice, tipo, aoUsar, aoAvisar,
}: {
  indice: number;
  tipo: TipoImagem;
  aoUsar: (i: ImagemBiblioteca) => void;
  aoAvisar: (t: string) => void;
}) {
  const ctx = useContext(ContextoImagens)!;
  const [busca, setBusca] = useState('');
  const vocab = vocabulario(tipo);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return ctx.biblioteca.imagens
      .filter((i) => i.status === 'aprovada' && i.tipo === tipo && (i.arquivo || i.origem === 'elenco'))
      .filter((i) => {
        if (!termo) return true;
        const nomesDasEtiquetas = Object.entries(i.etiquetas || {})
          .map(([g, id]) => vocab[g]?.opcoes.find((o) => o.id === id)?.nome || '');
        return [i.titulo, ...(i.temas || []), ...nomesDasEtiquetas].join(' ').toLowerCase().includes(termo);
      })
      // As suas primeiro — foram enviadas para serem usadas — e depois as mais usadas.
      .sort((a, b) => Number(b.origem === 'enviada') - Number(a.origem === 'enviada')
        || (b.vezesUsada || 0) - (a.vezesUsada || 0)
        || a.titulo.localeCompare(b.titulo));
  }, [ctx.biblioteca.imagens, tipo, busca, vocab]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => { ctx.trocarImagem(indice, { modo: 'automatica' }); aoAvisar('A página volta para o automático. Clique em Refazer no carrossel.'); }}
          className="px-2.5 py-1 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
          title="Como sempre foi: capa e última página recebem uma pessoa da casa; o miolo fica só com texto"
        >
          Automática
        </button>
        <button
          onClick={() => { ctx.trocarImagem(indice, { modo: 'nenhuma' }); aoAvisar('A página fica só com texto. Clique em Refazer no carrossel.'); }}
          className="px-2.5 py-1 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          Sem imagem
        </button>
        <div className="flex items-center gap-1 flex-1 min-w-[180px] px-2 py-1 rounded-lg border border-gray-300 bg-white">
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={tipo === 'cena' ? 'Buscar: fábrica, kanban, problema…' : 'Buscar: explicando, fábrica, dúvida…'}
            className="flex-1 min-w-0 text-xs outline-none bg-transparent"
          />
        </div>
      </div>

      {ctx.biblioteca.carregando ? (
        <p className="text-xs text-gray-500">Carregando a biblioteca…</p>
      ) : !lista.length ? (
        <p className="text-xs text-gray-500 italic">
          {tipo === 'cena'
            ? 'Ainda não há cenas na biblioteca. Gere a primeira com a IA ou envie uma foto sua.'
            : 'Nenhuma pessoa encontrada com essa busca.'}
        </p>
      ) : (
        <GradeDeImagens imagens={lista} aoEscolher={aoUsar} />
      )}
    </div>
  );
}

function GradeDeImagens({ imagens, aoEscolher }: { imagens: ImagemBiblioteca[]; aoEscolher: (i: ImagemBiblioteca) => void }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2 max-h-80 overflow-y-auto pr-1">
      {imagens.map((i) => (
        <button
          key={i.id}
          onClick={() => aoEscolher(i)}
          title={i.titulo}
          className="group text-left rounded border border-gray-200 bg-white overflow-hidden hover:border-blue-500"
        >
          <div className="aspect-[4/5] bg-gray-100 grid place-items-center">
            {i.arquivo ? (
              <Miniatura
                caminho={i.arquivo}
                className={`w-full h-full ${i.tipo === 'pessoa' ? 'object-contain object-bottom' : 'object-cover'}`}
              />
            ) : (
              <ImageOff className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <p className="px-1 py-0.5 text-[10px] leading-tight text-gray-700 line-clamp-2">
            {i.origem === 'enviada' && <span className="font-bold text-blue-700">Sua · </span>}
            {i.titulo}
          </p>
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */

function AbaGerar({
  indice, slide, tipo, aoUsar, aoAvisar,
}: {
  indice: number;
  slide: SlideRoteiro;
  tipo: TipoImagem;
  aoUsar: (i: ImagemBiblioteca) => void;
  aoAvisar: (t: string) => void;
}) {
  const ctx = useContext(ContextoImagens)!;
  const [etiquetas, setEtiquetas] = useState<Record<string, string>>(() => etiquetasValidas(tipo));
  const [detalhe, setDetalhe] = useState('');
  const [sugerindo, setSugerindo] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const vocab = vocabulario(tipo);

  async function chamar(corpo: Record<string, unknown>) {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : '';
    const r = await fetch('/api/marketing-consultor/imagem-da-pagina', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(corpo),
    });
    const resposta = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(resposta.error || `HTTP ${r.status}`);
    return resposta;
  }

  /** A IA lê a página e preenche as etiquetas. Não gera nada. */
  async function sugerir() {
    setSugerindo(true);
    setErro('');
    try {
      const r = await chamar({ acao: 'sugerir', tipo, pagina: { title: slide.title, body: slide.body, type: slide.type } });
      setEtiquetas(etiquetasValidas(tipo, r.etiquetas));
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setSugerindo(false);
    }
  }

  // Trocar de tipo troca o vocabulário inteiro, e a sugestão é pedida sozinha: é o
  // que o consultor faria a seguir de qualquer jeito.
  useEffect(() => {
    setEtiquetas(etiquetasValidas(tipo));
    if (`${slide.title}${slide.body}`.trim()) sugerir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, indice]);

  const parecidas = useMemo(() => {
    const minimo = tipo === 'cena' ? 4 : 5;
    return ctx.biblioteca.imagens
      .filter((i) => i.status === 'aprovada' && i.arquivo)
      .map((i) => ({ i, nota: semelhanca(i, tipo, etiquetas) }))
      .filter((x) => x.nota >= minimo)
      .sort((a, b) => b.nota - a.nota)
      .slice(0, 6)
      .map((x) => x.i);
  }, [ctx.biblioteca.imagens, tipo, etiquetas]);

  async function gerar() {
    setGerando(true);
    setErro('');
    try {
      await chamar({
        acao: 'gerar',
        tipo,
        etiquetas,
        detalhe: detalhe.trim() || undefined,
        criativoId: ctx.criativoId,
        pagina: { title: slide.title, body: slide.body, type: slide.type },
        previa: { render: semIndefinidos(ctx.montarRender(ctx.slides)), pagina: indice },
      });
      aoAvisar('Pedido feito. A imagem aparece acima, montada na página, em cerca de meio minuto.');
      ctx.biblioteca.recarregar();
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-gray-600">
          {sugerindo
            ? <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> A IA está lendo a página…</span>
            : 'A IA escolheu pelo texto da página. Confira e mude o que quiser antes de gerar.'}
        </p>
        <button
          onClick={sugerir}
          disabled={sugerindo}
          className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" /> Sugerir de novo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Object.entries(vocab).map(([grupo, { nome, opcoes }]) => (
          <label key={grupo} className="block">
            <span className="block text-[10px] font-bold uppercase text-gray-400">{nome}</span>
            <select
              value={etiquetas[grupo]}
              onChange={(e) => setEtiquetas((atual) => ({ ...atual, [grupo]: e.target.value }))}
              className="w-full px-2 py-1 rounded border border-gray-300 text-xs bg-white"
            >
              {opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </label>
        ))}
      </div>

      <label className="block">
        <span className="block text-[10px] font-bold uppercase text-gray-400">Algum detalhe a mais (opcional)</span>
        <input
          value={detalhe}
          onChange={(e) => setDetalhe(e.target.value)}
          maxLength={240}
          placeholder={tipo === 'cena' ? 'Ex.: linha de envase de bebidas' : 'Ex.: segurando um tablet com um gráfico'}
          className="w-full px-2 py-1 rounded border border-gray-300 text-xs"
        />
      </label>

      {parecidas.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-gray-700">
            Já existe{parecidas.length > 1 ? 'm' : ''} {parecidas.length} parecida{parecidas.length > 1 ? 's' : ''} — usar uma não custa nada
          </p>
          <GradeDeImagens imagens={parecidas} aoEscolher={aoUsar} />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={gerar}
          disabled={gerando || sugerindo}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {parecidas.length ? 'Gerar uma nova mesmo assim' : 'Gerar imagem'}
        </button>
        <span className="text-[11px] text-gray-500">Uma imagem por clique, cerca de US$ 0,01.</span>
      </div>
      {erro && <p className="text-xs text-red-700">{erro}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- */

const TIPOS_ACEITOS = ['image/png', 'image/jpeg', 'image/webp'];
const TAMANHO_MAXIMO = 15 * 1024 * 1024;

/**
 * A foto do próprio consultor.
 *
 * Pessoa perde o fundo no worker; cena vai inteira. Fica só na biblioteca DELE:
 * uma foto de alguém real não pode aparecer no carrossel de outro consultor.
 */
function AbaEnviar({ indice, tipo, aoAvisar }: { indice: number; tipo: TipoImagem; aoAvisar: (t: string) => void }) {
  const ctx = useContext(ContextoImagens)!;
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  function escolher(f: File | null) {
    setErro('');
    if (!f) { setArquivo(null); return; }
    if (!TIPOS_ACEITOS.includes(f.type)) { setErro('Use uma imagem PNG, JPG ou WEBP.'); return; }
    if (f.size > TAMANHO_MAXIMO) { setErro('A imagem passa de 15 MB. Reduza e tente de novo.'); return; }
    setArquivo(f);
    if (!titulo) setTitulo(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 60));
  }

  async function enviar() {
    if (!arquivo) return;
    setEnviando(true);
    setErro('');
    try {
      const refDoc = doc(collection(db, COLECOES.imagens));
      const extensao = arquivo.type === 'image/png' ? 'png' : arquivo.type === 'image/webp' ? 'webp' : 'jpg';
      const original = `marketing/${ctx.consultorId}/imagens/${refDoc.id}/original.${extensao}`;
      await uploadBytes(storageRef(storage, original), arquivo, { contentType: arquivo.type });

      const agora = new Date().toISOString();
      const ficha: ImagemBiblioteca = {
        id: refDoc.id,
        tipo,
        origem: 'enviada',
        status: 'processando',
        publica: false,
        // O automático continua saindo do elenco da casa; foto enviada só entra
        // onde o consultor escolher.
        automatica: false,
        consultorId: ctx.consultorId,
        titulo: titulo.trim() || (tipo === 'cena' ? 'Minha cena' : 'Minha foto'),
        etiquetas: {},
        temas: [],
        original,
        criativoId: ctx.criativoId,
        pagina: indice,
        vezesUsada: 0,
        criadoEm: agora,
        atualizadoEm: agora,
      };
      await setDoc(refDoc, semIndefinidos(ficha));

      await addDoc(collection(db, COLECOES.tarefas), {
        ...semIndefinidos({
          consultorId: ctx.consultorId,
          campanhaId: `${ctx.criativoId}__pecas`,
          tipo: 'preparar-imagem',
          imagemId: refDoc.id,
          status: 'pendente',
          tentativas: 0,
          previa: { render: ctx.montarRender(ctx.slides), pagina: indice },
          criadoEm: agora,
        }),
        // Fora da limpeza: serverTimestamp é um marcador, e não sobrevive ao JSON.
        criadoEmServidor: serverTimestamp(),
      });
      setArquivo(null);
      setTitulo('');
      aoAvisar('Imagem enviada. Ela aparece acima, montada na página, em cerca de meio minuto.');
      ctx.biblioteca.recarregar();
    } catch (e: any) {
      setErro(e?.message || String(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <p className="text-xs text-gray-600">
        {tipo === 'pessoa'
          ? 'Uma foto sua ou da sua equipe, da cintura para cima. O fundo é tirado sozinho, e a pessoa vai para o lado do texto.'
          : 'Uma foto do seu ambiente de trabalho — fábrica, quadro, reunião. Ela ocupa a página inteira, com o texto por cima.'}
        {' '}Fica só na sua biblioteca.
      </p>

      <input
        type="file"
        accept={TIPOS_ACEITOS.join(',')}
        onChange={(e) => escolher(e.target.files?.[0] || null)}
        className="block text-xs text-gray-700 file:mr-2 file:px-2.5 file:py-1 file:rounded-lg file:border file:border-gray-300 file:bg-white file:text-xs file:font-semibold"
      />

      {arquivo && (
        <>
          <label className="block">
            <span className="block text-[10px] font-bold uppercase text-gray-400">Nome, para achar depois</span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={60}
              className="w-full px-2 py-1 rounded border border-gray-300 text-xs"
            />
          </label>
          <button
            onClick={enviar}
            disabled={enviando}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Enviar e montar a página
          </button>
        </>
      )}
      {erro && <p className="text-xs text-red-700">{erro}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- */

function Miniatura({ caminho, className }: { caminho: string; className?: string }) {
  const { url, erro } = useArquivoUrl(caminho);
  if (erro) return <span className={`${className} bg-gray-100 block`} />;
  if (!url) return <span className={`${className} bg-gray-100 animate-pulse block`} />;
  return <img src={url} alt="" className={className} loading="lazy" />;
}

/** Aplica a escolha nas páginas. Fica aqui para a regra de layout morar junto da biblioteca. */
export function aplicarEscolha(slide: SlideRoteiro, escolha: EscolhaImagem): SlideRoteiro {
  const novo: SlideRoteiro = { ...slide };
  delete novo.imagemId;
  delete novo.pessoa;
  if (escolha.modo === 'nenhuma') {
    novo.pessoa = false;
    return novo;
  }
  if (escolha.modo === 'automatica') return novo;
  novo.imagemId = escolha.imagem.id;
  // Cena só aparece na página de foto; pessoa só nas que têm a coluna dela.
  if (escolha.imagem.tipo === 'cena') novo.type = 'foto';
  else if (!['capa', 'padrao', 'dado', 'cta'].includes(novo.type)) novo.type = 'padrao';
  return novo;
}
